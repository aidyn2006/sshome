from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.models.enums import DeviceAction


class EventRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    device_id: UUID
    action: DeviceAction
    timestamp: datetime
    owner_id: UUID
