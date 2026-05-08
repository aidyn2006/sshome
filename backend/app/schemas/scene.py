from uuid import UUID

from pydantic import BaseModel, Field, model_validator

from app.models.enums import DeviceAction, DeviceType
from app.schemas.device import DeviceRead


class SceneActionRequest(BaseModel):
    device_id: UUID | None = None
    device: str | None = Field(default=None, min_length=1, max_length=100)
    action: DeviceAction | None = None
    value: bool | None = None

    @model_validator(mode="after")
    def validate_target_and_action(self) -> "SceneActionRequest":
        if self.device_id is None and self.device is None:
            raise ValueError("Either device_id or device must be provided")
        if self.action is None and self.value is None:
            raise ValueError("Either action or value must be provided")
        return self


class SceneRunRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    actions: list[SceneActionRequest] = Field(min_length=1)


class SceneRunResult(BaseModel):
    name: str
    executed_actions: int
    devices: list[DeviceRead]


DEVICE_NAME_TO_TYPE: dict[str, DeviceType] = {
    "light": DeviceType.LIGHT,
    "lights": DeviceType.LIGHT,
    "lamp": DeviceType.LIGHT,
    "lamps": DeviceType.LIGHT,
    "свет": DeviceType.LIGHT,
    "лампа": DeviceType.LIGHT,
    "door": DeviceType.DOOR,
    "doors": DeviceType.DOOR,
    "дверь": DeviceType.DOOR,
    "двери": DeviceType.DOOR,
    "ac": DeviceType.AC,
    "conditioner": DeviceType.AC,
    "кондиционер": DeviceType.AC,
}
