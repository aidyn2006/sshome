"""MQTT-side defenses against replay and telemetry-flood (DDoS) attacks.

These guards live in front of the telemetry handler in the MQTT subscriber.
They are intentionally in-memory and per-device — enough to demonstrate the
defense in the red-team module and to protect a single backend instance.
"""

import time
from collections import defaultdict, deque
from threading import Lock
from typing import Deque

from app.core.config import settings


class ReplayGuard:
    """Rejects replayed telemetry using a per-device nonce cache + timestamp age.

    A genuine device stamps each message with a unique ``nonce`` and a ``ts``
    (unix seconds). A replayed capture reuses the same nonce — or arrives long
    after it was minted — and is dropped.
    """

    def __init__(self) -> None:
        self._nonces: dict[str, "deque[str]"] = defaultdict(deque)
        self._nonce_sets: dict[str, set[str]] = defaultdict(set)
        self._lock = Lock()

    def check(self, *, device_id: str, nonce: str | None, ts: float | None) -> tuple[bool, str | None]:
        """Return (accepted, reason_if_rejected)."""
        if nonce is None:
            # No anti-replay metadata — nothing to enforce (legacy devices).
            return True, None

        max_age = settings.security_replay_max_age_seconds
        if ts is not None:
            age = abs(time.time() - float(ts))
            if age > max_age:
                return False, f"stale timestamp (age {int(age)}s > {max_age}s)"

        with self._lock:
            seen = self._nonce_sets[device_id]
            if nonce in seen:
                return False, "duplicate nonce"

            order = self._nonces[device_id]
            order.append(nonce)
            seen.add(nonce)

            while len(order) > settings.security_replay_nonce_cache_size:
                evicted = order.popleft()
                seen.discard(evicted)

        return True, None


class TelemetryRateLimiter:
    """Sliding-window rate limit on telemetry messages per device (anti-DDoS)."""

    def __init__(self) -> None:
        self._events: dict[str, Deque[float]] = defaultdict(deque)
        self._lock = Lock()

    def allow(self, *, device_id: str) -> bool:
        limit = settings.security_telemetry_rate_limit
        window = settings.security_telemetry_rate_window_seconds
        now = time.monotonic()
        threshold = now - window

        with self._lock:
            events = self._events[device_id]
            while events and events[0] <= threshold:
                events.popleft()

            if len(events) >= limit:
                return False

            events.append(now)
            return True


replay_guard = ReplayGuard()
telemetry_rate_limiter = TelemetryRateLimiter()
