import uuid
from datetime import UTC, datetime
from enum import Enum
from typing import Any

from sqlalchemy import Boolean, DateTime, Enum as SAEnum, ForeignKey, JSON, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class AttackType(str, Enum):
    MQTT_SPOOFING = "MQTT_SPOOFING"
    BRUTE_FORCE = "BRUTE_FORCE"
    REPLAY = "REPLAY"
    DDOS = "DDOS"


class SecuritySeverity(str, Enum):
    INFO = "INFO"
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class SecurityEvent(Base):
    __tablename__ = "security_events"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    attack_type: Mapped[AttackType] = mapped_column(SAEnum(AttackType, name="attack_type"), nullable=False, index=True)
    # True  -> the system defended successfully (attack was blocked)
    # False -> the attack got through (defense gap, useful to surface in the demo)
    blocked: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    severity: Mapped[SecuritySeverity] = mapped_column(
        SAEnum(SecuritySeverity, name="security_severity"), nullable=False, default=SecuritySeverity.INFO
    )
    # what was attacked: a hardware_id, an email, an endpoint, ...
    target: Mapped[str | None] = mapped_column(String(255), nullable=True)
    source_ip: Mapped[str | None] = mapped_column(String(45), nullable=True)
    # human-readable one-liner shown in the live feed
    message: Mapped[str] = mapped_column(String(500), nullable=False)
    # correlates events produced by a single simulation run
    sim_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    # the admin who launched the simulation (NULL for organically-detected events)
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    detail: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False, index=True
    )
