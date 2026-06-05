from datetime import UTC, datetime, timedelta
import re
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, computed_field, field_validator

from app.models.enums import DeviceAction, DeviceStatus, DeviceType

HARDWARE_ID_PATTERN = re.compile(r"^(sshome_|esp8266_|sshome_esp8266_)[a-z0-9_-]{3,48}$")

# A hardware device is considered online if it reported telemetry recently.
ONLINE_WINDOW = timedelta(minutes=5)


class DeviceCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    type: DeviceType
    room_id: UUID
    hardware_id: str | None = Field(default=None, min_length=8, max_length=64)

    @field_validator("hardware_id")
    @classmethod
    def normalize_hardware_id(cls, value: str | None) -> str | None:
        if value is None:
            return None

        normalized = value.strip().lower()
        if not normalized:
            return None

        if HARDWARE_ID_PATTERN.fullmatch(normalized) is None:
            raise ValueError("Device ID must start with sshome_ or esp8266_, e.g. sshome_20260513_a3f2")

        return normalized


class DeviceRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    type: DeviceType
    status: DeviceStatus
    hardware_id: str | None = None
    room_id: UUID
    owner_id: UUID
    battery_level: int | None = None
    last_error: str | None = None
    last_seen_at: datetime | None = None
    telemetry: dict[str, Any] | None = None
    created_at: datetime
    updated_at: datetime

    @computed_field  # type: ignore[prop-decorator]
    @property
    def is_online(self) -> bool:
        if self.hardware_id is None:
            # Virtual devices live in the backend itself.
            return True
        if self.last_seen_at is None:
            return False
        last_seen = self.last_seen_at if self.last_seen_at.tzinfo else self.last_seen_at.replace(tzinfo=UTC)
        return datetime.now(UTC) - last_seen <= ONLINE_WINDOW


class DeviceUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    room_id: UUID | None = None


class DeviceActionRequest(BaseModel):
    action: DeviceAction
