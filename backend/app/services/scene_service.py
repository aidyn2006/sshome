from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.device import Device
from app.models.enums import DeviceAction, DeviceType
from app.schemas.scene import DEVICE_NAME_TO_TYPE, SceneActionRequest, SceneRunRequest, SceneRunResult
from app.services import device_service


def _normalize_device_type(raw_device: str) -> DeviceType:
    device_type = DEVICE_NAME_TO_TYPE.get(raw_device.strip().lower())
    if device_type is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Unknown scene device target: {raw_device}",
        )
    return device_type


def _action_from_value(*, device_type: DeviceType, value: bool) -> DeviceAction:
    if device_type in {DeviceType.LIGHT, DeviceType.AC}:
        return DeviceAction.TURN_ON if value else DeviceAction.TURN_OFF
    if device_type == DeviceType.DOOR:
        return DeviceAction.OPEN if value else DeviceAction.CLOSE

    raise HTTPException(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        detail=f"Boolean scene values are not supported for device type {device_type.value}",
    )


def _targets_for_action(db: Session, *, owner_id: UUID, action: SceneActionRequest) -> list[Device]:
    if action.device_id is not None:
        return [device_service.get_device_or_404(db, device_id=action.device_id, owner_id=owner_id)]

    device_type = _normalize_device_type(action.device or "")
    return [
        device
        for device in device_service.list_devices(db, owner_id=owner_id)
        if device.type == device_type
    ]


def _resolve_action(device: Device, action: SceneActionRequest) -> DeviceAction:
    if action.action is not None:
        return action.action
    return _action_from_value(device_type=device.type, value=bool(action.value))


def run_scene(db: Session, *, owner_id: UUID, payload: SceneRunRequest) -> SceneRunResult:
    updated_devices: list[Device] = []

    for scene_action in payload.actions:
        for device in _targets_for_action(db, owner_id=owner_id, action=scene_action):
            resolved_action = _resolve_action(device, scene_action)
            updated_devices.append(
                device_service._apply_device_action_to_device(
                    db,
                    device=device,
                    owner_id=owner_id,
                    action=resolved_action,
                )
            )

    db.commit()
    for device in updated_devices:
        db.refresh(device)

    return SceneRunResult(
        name=payload.name,
        executed_actions=len(updated_devices),
        devices=updated_devices,
    )
