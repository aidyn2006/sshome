"""Attack simulator — the offensive half of the red-team module.

Every simulation fires REAL traffic at our OWN system:

  * brute_force   -> real HTTP POSTs to our /auth/login endpoint
  * mqtt_spoofing -> real MQTT telemetry with a wrong secret
  * replay        -> a valid signed message captured and re-published
  * ddos          -> a real telemetry flood on the broker

The defensive half (rate limiter, secret verification, replay guard, telemetry
throttle) records what it blocks via security_event_service, so the dashboard
shows attack → defense end to end. This module only records the *offensive*
side (what was launched) plus, for brute-force, the directly-observed outcome.

These are intentionally bounded (intensity caps) and meant to be pointed at a
development instance you own.
"""

import json
import logging
import ssl
import time
from pathlib import Path
from uuid import UUID, uuid4

import httpx
import paho.mqtt.client as mqtt

from app.core.config import settings
from app.models.security_event import AttackType, SecuritySeverity
from app.services import device_registry, security_event_service, telegram_service
from app.services.mqtt_service import resolve_connection_settings

logger = logging.getLogger(__name__)

_INTENSITY_DEFAULTS = {
    AttackType.BRUTE_FORCE: 15,
    AttackType.MQTT_SPOOFING: 5,
    AttackType.REPLAY: 3,
    AttackType.DDOS: 60,
}
_INTENSITY_MAX = {
    AttackType.BRUTE_FORCE: 50,
    AttackType.MQTT_SPOOFING: 50,
    AttackType.REPLAY: 20,
    AttackType.DDOS: 500,
}


class SimulationError(Exception):
    """Raised when a simulation cannot run (e.g. no broker, no known device)."""


def _resolve_intensity(attack_type: AttackType, requested: int | None) -> int:
    default = _INTENSITY_DEFAULTS[attack_type]
    value = requested if requested and requested > 0 else default
    return min(value, _INTENSITY_MAX[attack_type])


# --- registry / secret helpers -------------------------------------------------

def _secrets_file() -> Path:
    path = Path("manufactured_secrets.txt")
    if path.is_dir():
        return path / "generated_secrets.txt"
    return path


def _load_device_secrets() -> dict[str, str]:
    path = _secrets_file()
    if not path.exists():
        return {}
    secrets_map: dict[str, str] = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        if "\t" not in line:
            continue
        hardware_id, secret = line.split("\t", 1)
        secrets_map[hardware_id.strip()] = secret.strip()
    return secrets_map


def _registry_entries() -> list[dict]:
    device_registry.load()
    return list(device_registry._registry.values())  # noqa: SLF001 — internal accessor, same package intent


def _auto_target() -> str | None:
    """Pick a hardware_id for spoofing (claimed preferred — it definitely has a secret_hash)."""
    entries = _registry_entries()
    claimed = [e["hardware_id"] for e in entries if e.get("claimed")]
    if claimed:
        return claimed[0]
    if entries:
        return entries[0]["hardware_id"]
    return None


def _auto_target_with_secret() -> tuple[str, str] | None:
    """Pick a (hardware_id, plaintext_secret) we can use to forge a *valid* message."""
    secrets_map = _load_device_secrets()
    if not secrets_map:
        return None
    entries = {e["hardware_id"]: e for e in _registry_entries()}
    # Prefer a claimed (registered) device so it also exists in the DB.
    for hardware_id, secret in secrets_map.items():
        entry = entries.get(hardware_id)
        if entry and entry.get("claimed"):
            return hardware_id, secret
    for hardware_id, secret in secrets_map.items():
        if hardware_id in entries:
            return hardware_id, secret
    return None


# --- MQTT publishing -----------------------------------------------------------

def _connect_client() -> mqtt.Client:
    connection = resolve_connection_settings()
    if connection is None:
        raise SimulationError("No MQTT broker configured — set HIVEMQ_CLUSTER_URL or enable MQTT")

    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id=f"sshome-redteam-{uuid4().hex[:8]}")
    if connection.username:
        client.username_pw_set(connection.username, connection.password)
    if connection.tls:
        client.tls_set(tls_version=ssl.PROTOCOL_TLS_CLIENT)
    client.connect(connection.host, connection.port, keepalive=20)
    client.loop_start()
    return client


def _disconnect_client(client: mqtt.Client) -> None:
    # Give queued publishes a moment to flush before tearing the connection down.
    time.sleep(0.5)
    client.loop_stop()
    client.disconnect()


def _telemetry_topic(hardware_id: str) -> str:
    return f"devices/{hardware_id}/telemetry"


# --- attacks -------------------------------------------------------------------

def _run_brute_force(
    *, sim_id: str, email: str, intensity: int, user_id: UUID | None, source_ip: str | None
) -> dict:
    url = f"{settings.security_self_base_url.rstrip('/')}/auth/login"
    attempts = _resolve_intensity(AttackType.BRUTE_FORCE, intensity)
    allowed = 0
    blocked = 0
    first_block_at: int | None = None

    with httpx.Client(timeout=10.0) as client:
        for i in range(attempts):
            try:
                response = client.post(url, json={"email": email, "password": f"wrong-pass-{i}-{uuid4().hex[:6]}"})
            except httpx.HTTPError:
                logger.exception("[SIM] brute-force request failed")
                continue
            if response.status_code == 429:
                blocked += 1
                if first_block_at is None:
                    first_block_at = i + 1
            else:
                allowed += 1

    was_blocked = blocked > 0
    if was_blocked:
        message = f"Brute-force on {email}: rate limit kicked in after {first_block_at} attempts ({blocked}/{attempts} throttled)"
        severity = SecuritySeverity.HIGH
    else:
        message = f"Brute-force on {email}: ALL {attempts} attempts allowed — no rate limiting triggered!"
        severity = SecuritySeverity.CRITICAL

    security_event_service.record_event(
        attack_type=AttackType.BRUTE_FORCE,
        blocked=was_blocked,
        severity=severity,
        target=email,
        source_ip=source_ip,
        sim_id=sim_id,
        user_id=user_id,
        message=message,
        detail={"attempts": attempts, "allowed": allowed, "throttled": blocked, "first_block_at": first_block_at},
    )
    return {"attempts": attempts, "allowed": allowed, "throttled": blocked, "blocked": was_blocked}


def _run_mqtt_spoofing(
    *, sim_id: str, hardware_id: str | None, intensity: int, user_id: UUID | None
) -> dict:
    target = hardware_id or _auto_target()
    if target is None:
        raise SimulationError("No manufactured device available to spoof — generate devices first")

    count = _resolve_intensity(AttackType.MQTT_SPOOFING, intensity)
    client = _connect_client()
    try:
        for i in range(count):
            payload = {
                "secret": f"forged-{uuid4().hex}",  # deliberately wrong secret
                "temp": 21.0 + i,
                "humidity": 40 + i,
                "sim_id": sim_id,
            }
            client.publish(_telemetry_topic(target), json.dumps(payload), qos=0)
    finally:
        _disconnect_client(client)

    # The subscriber records one MQTT_SPOOFING "blocked" event per dropped message.
    security_event_service.record_event(
        attack_type=AttackType.MQTT_SPOOFING,
        blocked=True,
        severity=SecuritySeverity.INFO,
        target=target,
        source_ip="redteam-sim",
        sim_id=sim_id,
        user_id=user_id,
        message=f"Launched {count} spoofed telemetry message(s) at {target} with forged secrets",
        alert=False,
    )
    return {"target": target, "messages": count}


def _run_replay(
    *, sim_id: str, hardware_id: str | None, secret: str | None, intensity: int, user_id: UUID | None
) -> dict:
    if hardware_id and secret:
        target, plain_secret = hardware_id, secret
    else:
        resolved = _auto_target_with_secret()
        if resolved is None:
            raise SimulationError("No device with a known secret available — provide target_hardware_id + target_secret")
        target, plain_secret = resolved

    repeats = _resolve_intensity(AttackType.REPLAY, intensity)
    # One captured, validly-signed message — the attacker re-sends this exact frame.
    captured = {
        "secret": plain_secret,
        "temp": 22.5,
        "humidity": 45,
        "nonce": uuid4().hex,
        "ts": int(time.time()),
        "sim_id": sim_id,
    }

    client = _connect_client()
    try:
        # First send is legitimate (passes all checks, updates telemetry).
        client.publish(_telemetry_topic(target), json.dumps(captured), qos=0)
        time.sleep(0.3)
        # Re-send the SAME frame — the replay guard rejects each one (duplicate nonce).
        for _ in range(repeats):
            client.publish(_telemetry_topic(target), json.dumps(captured), qos=0)
    finally:
        _disconnect_client(client)

    security_event_service.record_event(
        attack_type=AttackType.REPLAY,
        blocked=True,
        severity=SecuritySeverity.INFO,
        target=target,
        source_ip="redteam-sim",
        sim_id=sim_id,
        user_id=user_id,
        message=f"Captured a valid frame for {target} and replayed it {repeats} time(s)",
        alert=False,
    )
    return {"target": target, "replays": repeats}


def _run_ddos(
    *, sim_id: str, hardware_id: str | None, secret: str | None, intensity: int, user_id: UUID | None
) -> dict:
    if hardware_id and secret:
        target, plain_secret = hardware_id, secret
    else:
        resolved = _auto_target_with_secret()
        if resolved is None:
            raise SimulationError("No device with a known secret available — provide target_hardware_id + target_secret")
        target, plain_secret = resolved

    flood = _resolve_intensity(AttackType.DDOS, intensity)
    limit = settings.security_telemetry_rate_limit

    client = _connect_client()
    try:
        for i in range(flood):
            payload = {
                "secret": plain_secret,
                "temp": 20.0 + (i % 10),
                "nonce": uuid4().hex,  # unique so replay guard doesn't interfere
                "ts": int(time.time()),
                "sim_id": sim_id,
            }
            client.publish(_telemetry_topic(target), json.dumps(payload), qos=0)
    finally:
        _disconnect_client(client)

    expected_throttled = max(0, flood - limit)
    # Per-message DDoS blocks are recorded by the subscriber (alert=False); send one summary alert here.
    security_event_service.record_event(
        attack_type=AttackType.DDOS,
        blocked=True,
        severity=SecuritySeverity.HIGH,
        target=target,
        source_ip="redteam-sim",
        sim_id=sim_id,
        user_id=user_id,
        message=f"Flooded {target} with {flood} telemetry messages — throttle expected after {limit} (~{expected_throttled} dropped)",
    )
    return {"target": target, "messages": flood, "rate_limit": limit, "expected_throttled": expected_throttled}


# --- entry point ---------------------------------------------------------------

def run_simulation(
    *,
    attack_type: AttackType,
    intensity: int | None = None,
    target_hardware_id: str | None = None,
    target_secret: str | None = None,
    target_email: str | None = None,
    user_id: UUID | None = None,
    source_ip: str | None = None,
) -> dict:
    sim_id = uuid4().hex
    logger.info("[SIM] starting %s sim_id=%s", attack_type.value, sim_id)

    if attack_type == AttackType.BRUTE_FORCE:
        email = target_email or "victim@sshome.local"
        result = _run_brute_force(
            sim_id=sim_id, email=email, intensity=intensity or 0, user_id=user_id, source_ip=source_ip
        )
    elif attack_type == AttackType.MQTT_SPOOFING:
        result = _run_mqtt_spoofing(
            sim_id=sim_id, hardware_id=target_hardware_id, intensity=intensity or 0, user_id=user_id
        )
    elif attack_type == AttackType.REPLAY:
        result = _run_replay(
            sim_id=sim_id,
            hardware_id=target_hardware_id,
            secret=target_secret,
            intensity=intensity or 0,
            user_id=user_id,
        )
    elif attack_type == AttackType.DDOS:
        result = _run_ddos(
            sim_id=sim_id,
            hardware_id=target_hardware_id,
            secret=target_secret,
            intensity=intensity or 0,
            user_id=user_id,
        )
    else:  # pragma: no cover — guarded by the schema enum
        raise SimulationError(f"Unknown attack type: {attack_type}")

    return {"sim_id": sim_id, "attack_type": attack_type.value, **result}
