"""Records security events and fans them out to the live feed + Telegram.

A "security event" is one line in the red-team story: either an attack attempt
that the system blocked (the happy path we want to demonstrate) or one that got
through (a defense gap worth surfacing). Every event is:

  1. persisted to the security_events table (for the dashboard + history),
  2. broadcast over WebSocket to connected clients (live feed), and
  3. optionally pushed to Telegram (for notable events).

This is safe to call from async request handlers AND from background threads
(the MQTT subscriber, the attack simulator), so the WebSocket push detects its
execution context and schedules the coroutine on the right event loop.
"""

import asyncio
import logging
from contextlib import contextmanager
from typing import Any, Iterator
from uuid import UUID

from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models.security_event import AttackType, SecurityEvent, SecuritySeverity
from app.schemas.realtime import SecurityEventMessage
from app.services import telegram_service
from app.websockets import loop_registry
from app.websockets.publisher import publish_security_event

logger = logging.getLogger(__name__)

_ATTACK_LABELS = {
    AttackType.MQTT_SPOOFING: "MQTT Spoofing",
    AttackType.BRUTE_FORCE: "Brute-force",
    AttackType.REPLAY: "Replay",
    AttackType.DDOS: "Telemetry DDoS",
}


@contextmanager
def _session_scope(db: Session | None) -> Iterator[Session]:
    if db is not None:
        yield db
        return
    own = SessionLocal()
    try:
        yield own
    finally:
        own.close()


def _to_message(event: SecurityEvent) -> SecurityEventMessage:
    return SecurityEventMessage(
        id=event.id,
        attack_type=event.attack_type.value,
        blocked=event.blocked,
        severity=event.severity.value,
        target=event.target,
        source_ip=event.source_ip,
        message=event.message,
        sim_id=event.sim_id,
        created_at=event.created_at,
    )


def _push_to_feed(message: SecurityEventMessage) -> None:
    try:
        running = asyncio.get_running_loop()
    except RuntimeError:
        running = None

    if running is not None and running.is_running():
        running.create_task(publish_security_event(message=message))
        return

    main_loop = loop_registry.get_loop()
    if main_loop is not None and main_loop.is_running():
        asyncio.run_coroutine_threadsafe(publish_security_event(message=message), main_loop)
    else:
        logger.info("[SECURITY] WebSocket push skipped — no running event loop")


def _telegram_text(event: SecurityEvent) -> str:
    label = _ATTACK_LABELS.get(event.attack_type, event.attack_type.value)
    if event.blocked:
        head = f"🛡 <b>Attack blocked</b> — {label}"
    else:
        head = f"🚨 <b>Attack NOT blocked</b> — {label}"
    lines = [head, event.message]
    if event.target:
        lines.append(f"Target: <code>{event.target}</code>")
    if event.source_ip:
        lines.append(f"Source: <code>{event.source_ip}</code>")
    lines.append(f"Severity: {event.severity.value}")
    return "\n".join(lines)


def record_event(
    *,
    attack_type: AttackType,
    message: str,
    blocked: bool = True,
    severity: SecuritySeverity = SecuritySeverity.INFO,
    target: str | None = None,
    source_ip: str | None = None,
    sim_id: str | None = None,
    user_id: UUID | None = None,
    detail: dict[str, Any] | None = None,
    db: Session | None = None,
    alert: bool = True,
) -> SecurityEvent:
    with _session_scope(db) as session:
        event = SecurityEvent(
            attack_type=attack_type,
            blocked=blocked,
            severity=severity,
            target=target,
            source_ip=source_ip,
            message=message,
            sim_id=sim_id,
            user_id=user_id,
            detail=detail,
        )
        session.add(event)
        session.commit()
        session.refresh(event)
        feed_message = _to_message(event)

    _push_to_feed(feed_message)

    if alert:
        try:
            telegram_service.send_alert(_telegram_text(event))
        except Exception:
            logger.exception("[SECURITY] Telegram alert dispatch failed")

    return event
