from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.schemas.device import DeviceRead


class HomeStateSummary(BaseModel):
    total_devices: int
    active_devices: int
    open_doors: int


class HomeStateRead(BaseModel):
    generated_at: datetime
    summary: HomeStateSummary
    devices: list[DeviceRead]


class AutomationSuggestion(BaseModel):
    id: str
    title: str
    message: str
    device_id: UUID
    device_name: str
    action: str
    suggested_time: str
    confidence: float
    evidence_count: int


class AutomationSuggestionList(BaseModel):
    generated_at: datetime
    suggestions: list[AutomationSuggestion]


class AICommandRequest(BaseModel):
    command: str


class AICommandResult(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    understood: bool
    message: str
    devices: list[DeviceRead]
