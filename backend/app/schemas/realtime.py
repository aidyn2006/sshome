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
    source: Literal["device_action", "scenario_run"]
    device: DeviceRead
    action: DeviceAction | None = None
    scenario_id: UUID | None = None
