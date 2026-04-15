from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import DeviceAction, DeviceStatus, DeviceType


class DeviceCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    type: DeviceType
    room_id: UUID


class DeviceRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    type: DeviceType
    status: DeviceStatus
    room_id: UUID
    owner_id: UUID
    created_at: datetime
    updated_at: datetime


class DeviceActionRequest(BaseModel):
    action: DeviceAction
