from collections import defaultdict, deque
from threading import Lock
from time import monotonic
from typing import Deque

from fastapi import HTTPException, Request, WebSocket, status

from app.core.config import settings


class InMemoryRateLimiter:
    def __init__(self) -> None:
        self._events: dict[str, Deque[float]] = defaultdict(deque)
        self._lock = Lock()

    def allow(self, *, key: str, limit: int, window_seconds: int) -> bool:
        now = monotonic()
        threshold = now - window_seconds

        with self._lock:
            events = self._events[key]
            while events and events[0] <= threshold:
                events.popleft()

            if len(events) >= limit:
                return False

            events.append(now)
            return True

    def reset(self) -> None:
        with self._lock:
            self._events.clear()


device_action_limiter = InMemoryRateLimiter()
scenario_run_limiter = InMemoryRateLimiter()
websocket_connect_limiter = InMemoryRateLimiter()
login_limiter = InMemoryRateLimiter()
login_ip_limiter = InMemoryRateLimiter()
password_reset_request_limiter = InMemoryRateLimiter()
password_reset_verify_limiter = InMemoryRateLimiter()


def _client_host(scope_carrier: Request | WebSocket) -> str:
    # Behind a reverse proxy (e.g. the bundled nginx) the socket peer is always
    # the proxy, so every real client collapses to one IP. When proxy headers are
    # trusted, recover the original client from X-Forwarded-For (left-most entry).
    if settings.security_trust_proxy_headers:
        forwarded = scope_carrier.headers.get("x-forwarded-for")
        if forwarded:
            client = forwarded.split(",")[0].strip()
            if client:
                return client
    if scope_carrier.client is None:
        return "unknown"
    return scope_carrier.client.host or "unknown"


def _build_rate_limit_key(*, prefix: str, owner_id: str, client_host: str) -> str:
    return f"{prefix}:{owner_id}:{client_host}"


def enforce_device_action_rate_limit(request: Request, owner_id: str) -> None:
    key = _build_rate_limit_key(
        prefix="device_action",
        owner_id=owner_id,
        client_host=_client_host(request),
    )
    if not device_action_limiter.allow(
        key=key,
        limit=settings.security_device_action_rate_limit,
        window_seconds=settings.security_rate_limit_window_seconds,
    ):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many device control requests",
        )


def enforce_scenario_run_rate_limit(request: Request, owner_id: str) -> None:
    key = _build_rate_limit_key(
        prefix="scenario_run",
        owner_id=owner_id,
        client_host=_client_host(request),
    )
    if not scenario_run_limiter.allow(
        key=key,
        limit=settings.security_scenario_run_rate_limit,
        window_seconds=settings.security_rate_limit_window_seconds,
    ):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many scenario execution requests",
        )


def enforce_login_rate_limit(request: Request, email: str) -> None:
    client_host = _client_host(request)
    window = settings.security_rate_limit_window_seconds

    # Layer 1: per (account, IP) — classic single-account brute force.
    account_key = _build_rate_limit_key(
        prefix="login",
        owner_id=email.strip().lower(),
        client_host=client_host,
    )
    account_ok = login_limiter.allow(
        key=account_key,
        limit=settings.security_login_rate_limit,
        window_seconds=window,
    )

    # Layer 2: per IP across ALL accounts — credential spraying / stuffing,
    # where each distinct email would otherwise get its own fresh bucket.
    ip_ok = login_ip_limiter.allow(
        key=f"login_ip:{client_host}",
        limit=settings.security_login_ip_rate_limit,
        window_seconds=window,
    )

    # Call both so every attempt counts against both buckets before deciding.
    if not (account_ok and ip_ok):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many login attempts, try again later",
        )


def enforce_websocket_connect_rate_limit(websocket: WebSocket, owner_id: str) -> None:
    key = _build_rate_limit_key(
        prefix="ws_connect",
        owner_id=owner_id,
        client_host=_client_host(websocket),
    )
    if not websocket_connect_limiter.allow(
        key=key,
        limit=settings.security_websocket_connect_rate_limit,
        window_seconds=settings.security_rate_limit_window_seconds,
    ):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many websocket connection attempts",
        )


def enforce_password_reset_request_rate_limit(request: Request, email: str) -> None:
    key = _build_rate_limit_key(
        prefix="password_reset_request",
        owner_id=email.strip().lower(),
        client_host=_client_host(request),
    )
    if not password_reset_request_limiter.allow(
        key=key,
        limit=settings.security_password_reset_request_rate_limit,
        window_seconds=settings.security_rate_limit_window_seconds,
    ):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many password reset requests",
        )


def enforce_password_reset_verify_rate_limit(request: Request, email: str) -> None:
    key = _build_rate_limit_key(
        prefix="password_reset_verify",
        owner_id=email.strip().lower(),
        client_host=_client_host(request),
    )
    if not password_reset_verify_limiter.allow(
        key=key,
        limit=settings.security_password_reset_verify_rate_limit,
        window_seconds=settings.security_rate_limit_window_seconds,
    ):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many password reset code attempts",
        )
