from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel

from app.models.enums import DeviceAction
from app.schemas.device import DeviceRead


class ConnectionEstablishedMessage(BaseModel):
    type: Literal["connection.established"] = "connection.established"
    owner_id: UUID


class DeviceUpdatedMessage(BaseModel):
    type: Literal["device.updated"] = "device.updated"
    owner_id: UUID
    source: Literal["device_action", "device_update", "scenario_run", "telemetry"]
    device: DeviceRead
    action: DeviceAction | None = None
    scenario_id: UUID | None = None


class SecurityEventMessage(BaseModel):
    type: Literal["security.event"] = "security.event"
    id: UUID
    attack_type: str
    blocked: bool
    severity: str
    target: str | None = None
    source_ip: str | None = None
    message: str
    sim_id: str | None = None
    created_at: datetime
