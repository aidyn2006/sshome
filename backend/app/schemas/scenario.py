from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.core.config import settings
from app.models.enums import DeviceAction
from app.schemas.device import DeviceRead


class ScenarioActionItem(BaseModel):
    device_id: UUID
    action: DeviceAction


class ScenarioCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: str | None = None
    actions: list[ScenarioActionItem] = Field(min_length=1)

    @field_validator("actions")
    @classmethod
    def validate_actions_limit(cls, actions: list[ScenarioActionItem]) -> list[ScenarioActionItem]:
        if len(actions) > settings.scenario_max_actions:
            raise ValueError(
                f"Scenario can include at most {settings.scenario_max_actions} actions"
            )
        return actions


class ScenarioRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    description: str | None
    actions: list[ScenarioActionItem]
    owner_id: UUID
    created_at: datetime


class ScenarioRunResult(BaseModel):
    scenario_id: UUID
    executed_actions: int
    devices: list[DeviceRead]
