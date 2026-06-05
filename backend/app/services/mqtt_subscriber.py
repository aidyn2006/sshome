import asyncio
import json
import logging
import ssl
import threading
import time
from datetime import UTC, datetime
from urllib.parse import urlparse
from uuid import UUID

import paho.mqtt.client as mqtt
from sqlalchemy import select

from app.core.config import settings
from app.core.mqtt_defense import replay_guard, telemetry_rate_limiter
from app.db.session import SessionLocal
from app.models.device import Device
from app.models.security_event import AttackType, SecuritySeverity
from app.schemas.device import DeviceRead
from app.services import security_event_service
from app.services.device_service import verify_device_secret
from app.services.device_registry import get_secret_hash

logger = logging.getLogger(__name__)

_client: mqtt.Client | None = None
_thread: threading.Thread | None = None
_loop: asyncio.AbstractEventLoop | None = None
_stopping = threading.Event()

_RECONNECT_MIN_SECONDS = 5
_RECONNECT_MAX_SECONDS = 120


def _on_connect(client: mqtt.Client, userdata: object, flags: object, reason_code: object, properties: object = None) -> None:
    if reason_code == 0:
        client.subscribe("devices/+/telemetry")
        client.subscribe("devices/+/errors")
        logger.warning("MQTT subscriber connected — listening for telemetry and errors")
    else:
        logger.error("MQTT subscriber failed to connect, reason_code=%s", reason_code)


def _on_message(client: mqtt.Client, userdata: object, msg: mqtt.MQTTMessage) -> None:
    logger.warning("[MQTT] message received: topic=%s payload=%s", msg.topic, msg.payload[:200])

    parts = msg.topic.split("/")
    if len(parts) != 3 or parts[0] != "devices":
        return

    hardware_id = parts[1]
    msg_type = parts[2]

    try:
        payload = json.loads(msg.payload.decode())
    except (json.JSONDecodeError, UnicodeDecodeError):
        logger.warning("[MQTT] non-JSON payload on topic %s", msg.topic)
        return

    received_secret = payload.get("secret") if isinstance(payload, dict) else None
    if received_secret:
        registry_hash = get_secret_hash(hardware_id)
        if registry_hash and not verify_device_secret(str(received_secret), registry_hash):
            logger.warning("[MQTT] invalid secret from device %s - dropped", hardware_id)
            _record_spoofing(hardware_id, sim_id=payload.get("sim_id") if isinstance(payload, dict) else None)
            return

    db = SessionLocal()
    try:
        device = db.scalar(select(Device).where(Device.hardware_id == hardware_id))
        if device is None:
            logger.warning("[MQTT] device not found in DB: %s", hardware_id)
            return

        if device.device_secret_hash and not received_secret:
            logger.warning("[MQTT] device %s requires secret but none provided - dropped", hardware_id)
            return

        if device.device_secret_hash and received_secret:
            if not verify_device_secret(str(received_secret), device.device_secret_hash):
                logger.warning("[MQTT] wrong secret from device %s - dropped", hardware_id)
                _record_spoofing(hardware_id, sim_id=payload.get("sim_id"))
                return

        sim_id = payload.get("sim_id") if isinstance(payload, dict) else None

        if msg_type == "telemetry":
            # Anti-DDoS: throttle telemetry floods per device.
            if not telemetry_rate_limiter.allow(device_id=hardware_id):
                logger.info("[MQTT] telemetry rate limit hit for %s — message dropped", hardware_id)
                _record_ddos(hardware_id, sim_id=sim_id)
                return

            # Anti-replay: reject reused nonces / stale timestamps.
            accepted, reason = replay_guard.check(
                device_id=hardware_id,
                nonce=payload.get("nonce"),
                ts=payload.get("ts"),
            )
            if not accepted:
                logger.info("[MQTT] replay detected from %s (%s) — message dropped", hardware_id, reason)
                _record_replay(hardware_id, reason=reason, sim_id=sim_id)
                return

        device.last_seen_at = datetime.now(UTC)

        if msg_type == "telemetry":
            device.telemetry = {k: v for k, v in payload.items() if k not in ("secret", "nonce", "ts", "sim_id")}
            if "battery" in payload:
                device.battery_level = max(0, min(100, int(payload["battery"])))
            device.last_error = None
            logger.warning("[MQTT] telemetry saved for %s: %s", hardware_id, device.telemetry)

        elif msg_type == "errors":
            error_msg = payload.get("message") or payload.get("error") or str(payload)
            device.last_error = str(error_msg)[:500]
            logger.warning("[MQTT] error saved for %s: %s", hardware_id, device.last_error)

        db.commit()
        db.refresh(device)
        logger.warning("[MQTT] DB commit ok, loop running=%s", _loop.is_running() if _loop else False)
        _push_device_update(device)
    except Exception:
        logger.exception("[MQTT] error handling message on topic %s", msg.topic)
        db.rollback()
    finally:
        db.close()


def _push_device_update(device: Device) -> None:
    if _loop is None or not _loop.is_running():
        logger.info("[MQTT] WebSocket push skipped — _loop=%s", _loop)
        return
    try:
        from app.websockets.publisher import publish_device_update
        future = asyncio.run_coroutine_threadsafe(
            publish_device_update(
                owner_id=UUID(str(device.owner_id)),
                device=DeviceRead.model_validate(device),
                source="telemetry",
            ),
            _loop,
        )
        future.add_done_callback(
            lambda f: logger.error("[MQTT] WebSocket push error: %s", f.exception()) if f.exception() else None
        )
        logger.warning("[MQTT] WebSocket push scheduled")
    except Exception:
        logger.exception("[MQTT] WebSocket push failed")


def _record_spoofing(hardware_id: str, *, sim_id: str | None = None) -> None:
    security_event_service.record_event(
        attack_type=AttackType.MQTT_SPOOFING,
        blocked=True,
        severity=SecuritySeverity.HIGH,
        target=hardware_id,
        source_ip="mqtt",
        sim_id=sim_id,
        message=f"Blocked spoofed telemetry for {hardware_id} — secret verification failed",
    )


def _record_replay(hardware_id: str, *, reason: str | None, sim_id: str | None = None) -> None:
    security_event_service.record_event(
        attack_type=AttackType.REPLAY,
        blocked=True,
        severity=SecuritySeverity.MEDIUM,
        target=hardware_id,
        source_ip="mqtt",
        sim_id=sim_id,
        message=f"Blocked replayed message for {hardware_id} ({reason or 'replay'})",
        detail={"reason": reason},
    )


def _record_ddos(hardware_id: str, *, sim_id: str | None = None) -> None:
    # alert=False: a flood produces many of these; the simulator sends one summary alert.
    security_event_service.record_event(
        attack_type=AttackType.DDOS,
        blocked=True,
        severity=SecuritySeverity.MEDIUM,
        target=hardware_id,
        source_ip="mqtt",
        sim_id=sim_id,
        message=f"Throttled telemetry flood from {hardware_id}",
        alert=False,
    )


def _build_client() -> mqtt.Client | None:
    cluster_url = (settings.hivemq_cluster_url or "").strip()
    use_hivemq = bool(cluster_url)

    if not use_hivemq and not settings.mqtt_enabled:
        return None

    client = mqtt.Client(
        mqtt.CallbackAPIVersion.VERSION2,
        client_id=f"{settings.mqtt_client_id}-subscriber",
    )
    client.on_connect = _on_connect
    client.on_message = _on_message
    client.reconnect_delay_set(min_delay=_RECONNECT_MIN_SECONDS, max_delay=_RECONNECT_MAX_SECONDS)

    if use_hivemq:
        normalized = cluster_url if "://" in cluster_url else f"mqtts://{cluster_url}"
        host = urlparse(normalized).hostname or cluster_url

        username = settings.hivemq_username or settings.mqtt_username
        password = settings.hivemq_password or settings.mqtt_password
        if username:
            client.username_pw_set(username, password)

        client.tls_set(tls_version=ssl.PROTOCOL_TLS_CLIENT)
        client.connect_async(host, settings.hivemq_port)
    else:
        if settings.mqtt_username:
            client.username_pw_set(settings.mqtt_username, settings.mqtt_password)
        if settings.mqtt_tls:
            client.tls_set(tls_version=ssl.PROTOCOL_TLS_CLIENT)
        client.connect_async(settings.mqtt_host, settings.mqtt_port)

    return client


def _run_loop(client: mqtt.Client) -> None:
    """Keep the MQTT loop alive: an unreachable broker must not kill the thread."""
    delay = _RECONNECT_MIN_SECONDS
    while not _stopping.is_set():
        try:
            client.loop_forever(retry_first_connection=True)
            # loop_forever returned — either stop() disconnected us or the loop ended cleanly
            if _stopping.is_set():
                return
        except Exception as exc:
            logger.warning("MQTT subscriber connection failed (%s: %s) — retrying in %ds", type(exc).__name__, exc, delay)
        if _stopping.wait(timeout=delay):
            return
        delay = min(delay * 2, _RECONNECT_MAX_SECONDS)


def start() -> None:
    global _client, _thread, _loop

    try:
        _loop = asyncio.get_running_loop()
        logger.info("MQTT subscriber captured event loop: %s", _loop)
    except RuntimeError:
        logger.warning("MQTT subscriber: no running event loop at start — WebSocket push will be disabled")
    _client = _build_client()
    if _client is None:
        logger.info("MQTT subscriber not started — no broker configured")
        return

    _stopping.clear()
    _thread = threading.Thread(target=_run_loop, args=(_client,), daemon=True, name="mqtt-subscriber")
    _thread.start()
    logger.info("MQTT subscriber thread started")


def stop() -> None:
    global _client
    _stopping.set()
    if _client is not None:
        _client.disconnect()
        _client = None
