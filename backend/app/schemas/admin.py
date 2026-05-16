from pydantic import BaseModel, Field

from app.models.enums import DeviceType
from app.models.user import UserRole
from app.schemas.user import UserOut


class ManufacturedDeviceOut(BaseModel):
    hardware_id: str
    device_type: DeviceType
    secret: str | None = None
    secret_hash: str | None = None
    batch: str
    claimed: bool = False


class GenerateManufacturedDevicesRequest(BaseModel):
    count: int = Field(default=5, ge=1, le=500)
    device_type: DeviceType = DeviceType.LIGHT


class GenerateManufacturedDevicesResponse(BaseModel):
    devices: list[ManufacturedDeviceOut]


class UpdateUserRoleRequest(BaseModel):
    role: UserRole


AdminUserOut = UserOut
