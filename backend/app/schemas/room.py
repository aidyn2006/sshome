from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class RoomCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    home_id: UUID


class RoomRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    home_id: UUID
    created_at: datetime
