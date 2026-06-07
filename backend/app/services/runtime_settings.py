"""Runtime-editable settings, backed by the app_settings table.

Some settings (the Telegram chat id / bot token) are nicer to edit from the app
than to bake into environment variables. These live in the DB and are mirrored
in a small in-memory cache so background threads (MQTT, WebSocket publishers)
can read them without holding a request-scoped session.

Effective value = DB override (if set) else the env default from `settings`.
"""

import logging
import threading

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.app_setting import AppSetting

logger = logging.getLogger(__name__)

TELEGRAM_BOT_TOKEN_KEY = "telegram_bot_token"
TELEGRAM_CHAT_ID_KEY = "telegram_chat_id"
TELEGRAM_ENABLED_KEY = "telegram_enabled"

_MANAGED_KEYS = (TELEGRAM_BOT_TOKEN_KEY, TELEGRAM_CHAT_ID_KEY, TELEGRAM_ENABLED_KEY)

_lock = threading.Lock()
_cache: dict[str, str | None] = {}


def load_from_db(db: Session) -> None:
    """Prime the in-memory cache from the DB (called once at startup)."""
    rows = db.scalars(select(AppSetting).where(AppSetting.key.in_(_MANAGED_KEYS))).all()
    with _lock:
        _cache.clear()
        for row in rows:
            _cache[row.key] = row.value
    logger.info("[settings] loaded %d runtime setting(s) from DB", len(rows))


def _cached(key: str) -> str | None:
    with _lock:
        return _cache.get(key)


def get_telegram_settings() -> dict:
    """Effective Telegram config: DB override first, env default second."""
    token = _cached(TELEGRAM_BOT_TOKEN_KEY) or settings.telegram_bot_token
    chat_id = _cached(TELEGRAM_CHAT_ID_KEY) or settings.telegram_chat_id
    enabled_raw = _cached(TELEGRAM_ENABLED_KEY)
    enabled = True if enabled_raw is None else enabled_raw == "true"
    return {"bot_token": token or None, "chat_id": chat_id or None, "enabled": enabled}


def update_telegram_settings(
    db: Session,
    *,
    bot_token: str | None = None,
    chat_id: str | None = None,
    enabled: bool | None = None,
) -> None:
    """Persist the provided fields (None = leave unchanged) and refresh the cache.

    An empty string clears the override (falls back to the env default).
    """
    updates: dict[str, str | None] = {}
    if bot_token is not None:
        updates[TELEGRAM_BOT_TOKEN_KEY] = bot_token.strip() or None
    if chat_id is not None:
        updates[TELEGRAM_CHAT_ID_KEY] = chat_id.strip() or None
    if enabled is not None:
        updates[TELEGRAM_ENABLED_KEY] = "true" if enabled else "false"

    if not updates:
        return

    for key, value in updates.items():
        row = db.scalar(select(AppSetting).where(AppSetting.key == key))
        if row is None:
            db.add(AppSetting(key=key, value=value))
        else:
            row.value = value
    db.commit()

    with _lock:
        _cache.update(updates)
