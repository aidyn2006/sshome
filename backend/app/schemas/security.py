from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.security_event import AttackType, SecuritySeverity


class SimulateAttackRequest(BaseModel):
    attack_type: AttackType
    intensity: int | None = Field(default=None, ge=1, le=500)
    target_hardware_id: str | None = None
    target_secret: str | None = None
    target_email: str | None = None


class SimulateAttackResponse(BaseModel):
    sim_id: str
    attack_type: AttackType
    summary: dict[str, Any]


class SecurityEventOut(BaseModel):
    id: UUID
    attack_type: AttackType
    blocked: bool
    severity: SecuritySeverity
    target: str | None
    source_ip: str | None
    message: str
    sim_id: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class SecurityStatsOut(BaseModel):
    total: int
    blocked: int
    not_blocked: int
    by_type: dict[str, int]
    telegram_configured: bool


class TelegramSettingsOut(BaseModel):
    enabled: bool
    chat_id: str | None
    has_token: bool
    configured: bool


class TelegramSettingsUpdate(BaseModel):
    # None = leave unchanged; "" = clear the override (fall back to env default).
    bot_token: str | None = Field(default=None, max_length=1024)
    chat_id: str | None = Field(default=None, max_length=1024)
    enabled: bool | None = None
