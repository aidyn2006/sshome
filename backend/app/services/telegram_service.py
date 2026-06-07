"""Telegram alerting for the security module.

Sends a message via the Telegram Bot API whenever a notable security event is
recorded. If no bot token is configured the alert is simply logged, so the rest
of the system keeps working without any Telegram setup.
"""

import logging
import threading

import httpx

from app.core.config import settings
from app.services import runtime_settings

logger = logging.getLogger(__name__)


def is_configured() -> bool:
    cfg = runtime_settings.get_telegram_settings()
    return bool(cfg["enabled"] and cfg["bot_token"] and cfg["chat_id"])


def _send_blocking(text: str, *, bot_token: str, chat_id: str) -> None:
    url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
    try:
        response = httpx.post(
            url,
            json={
                "chat_id": chat_id,
                "text": text,
                "parse_mode": "HTML",
                "disable_web_page_preview": True,
            },
            timeout=settings.telegram_api_timeout_seconds,
        )
        if response.status_code != 200:
            logger.warning("Telegram alert failed: status=%s body=%s", response.status_code, response.text[:200])
    except Exception:
        logger.exception("Telegram alert request failed")


def send_alert(text: str) -> None:
    """Fire-and-forget alert. Never blocks the caller or raises."""
    cfg = runtime_settings.get_telegram_settings()
    if not (cfg["enabled"] and cfg["bot_token"] and cfg["chat_id"]):
        logger.info("[TELEGRAM] (not configured) %s", text)
        return

    threading.Thread(
        target=_send_blocking,
        args=(text,),
        kwargs={"bot_token": cfg["bot_token"], "chat_id": cfg["chat_id"]},
        daemon=True,
        name="telegram-alert",
    ).start()
