from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import DeviceAction
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


class AIScenarioDraftRequest(BaseModel):
    prompt: str = Field(min_length=3, max_length=1000)


class AIScenarioDraftAction(BaseModel):
    device_id: UUID
    action: DeviceAction


class AIScenarioDraft(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    description: str | None = Field(default=None, max_length=240)
    actions: list[AIScenarioDraftAction] = Field(min_length=1, max_length=20)
    explanation: str = Field(min_length=1, max_length=400)
