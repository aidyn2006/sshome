from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy.orm import Session

from app.core.deps import CurrentOwnerId
from app.core.rate_limit import enforce_device_action_rate_limit
from app.db.session import get_db
from app.models.enums import DeviceAction, DeviceStatus
from app.schemas.device import DeviceActionRequest, DeviceCreate, DeviceRead, DeviceUpdate
from app.schemas.device import DeviceActionRequest, DeviceCreate, DeviceRead, DeviceTypeUpdateRequest
from app.services import device_service
from app.services.mqtt_service import publish_device_command
from app.websockets.publisher import publish_device_update_from_sync

router = APIRouter(prefix="/devices", tags=["devices"])


def _action_for_result_status(status_value: DeviceStatus | str) -> DeviceAction:
    status_text = status_value.value if isinstance(status_value, DeviceStatus) else status_value
    return {
        DeviceStatus.ON.value: DeviceAction.TURN_ON,
        DeviceStatus.OFF.value: DeviceAction.TURN_OFF,
        DeviceStatus.OPEN.value: DeviceAction.OPEN,
        DeviceStatus.CLOSED.value: DeviceAction.CLOSE,
    }[status_text]


@router.post("", response_model=DeviceRead, status_code=status.HTTP_201_CREATED)
def create_device(
    payload: DeviceCreate,
    owner_id: CurrentOwnerId,
    db: Session = Depends(get_db),
) -> DeviceRead:
    device, _ = device_service.create_device(db, owner_id=owner_id, payload=payload)
    return device


@router.get("", response_model=list[DeviceRead])
def list_devices(
    owner_id: CurrentOwnerId,
    db: Session = Depends(get_db),
    home_id: UUID | None = Query(default=None),
) -> list[DeviceRead]:
    return device_service.list_devices(db, owner_id=owner_id, home_id=home_id)


@router.get("/{device_id}", response_model=DeviceRead)
def get_device(
    device_id: UUID,
    owner_id: CurrentOwnerId,
    db: Session = Depends(get_db),
) -> DeviceRead:
    return device_service.get_device_or_404(db, device_id=device_id, owner_id=owner_id)


@router.post("/{device_id}/action", response_model=DeviceRead)
def apply_device_action(
    device_id: UUID,
    payload: DeviceActionRequest,
    owner_id: CurrentOwnerId,
    request: Request,
    db: Session = Depends(get_db),
) -> DeviceRead:
    enforce_device_action_rate_limit(request, str(owner_id))
    device = device_service.apply_device_action(
        db,
        device_id=device_id,
        owner_id=owner_id,
        action=payload.action,
    )
    publish_device_update_from_sync(
        owner_id=owner_id,
        device=DeviceRead.model_validate(device),
        source="device_action",
        action=payload.action,
    )
    publish_device_command(device=device, action=payload.action)
    return device


@router.patch("/{device_id}", response_model=DeviceRead)
def update_device(
    device_id: UUID,
    payload: DeviceUpdate,
    owner_id: CurrentOwnerId,
    db: Session = Depends(get_db),
) -> DeviceRead:
    device = device_service.update_device(db, device_id=device_id, owner_id=owner_id, payload=payload)
    device_read = DeviceRead.model_validate(device)
    publish_device_update_from_sync(
        owner_id=owner_id,
        device=device_read,
        source="device_update",
    )
    return device_read


@router.delete("/{device_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_device(
    device_id: UUID,
    owner_id: CurrentOwnerId,
    db: Session = Depends(get_db),
) -> None:
    device_service.delete_device(db, device_id=device_id, owner_id=owner_id)


@router.patch("/{device_id}/type", response_model=DeviceRead)
def update_device_type(
    device_id: UUID,
    payload: DeviceTypeUpdateRequest,
    owner_id: CurrentOwnerId,
    db: Session = Depends(get_db),
) -> DeviceRead:
    device = device_service.update_device_type(
        db,
        device_id=device_id,
        owner_id=owner_id,
        device_type=payload.type,
    )
    return DeviceRead.model_validate(device)


@router.post("/{device_id}/toggle", response_model=DeviceRead)
def toggle_device(
    device_id: UUID,
    owner_id: CurrentOwnerId,
    request: Request,
    db: Session = Depends(get_db),
) -> DeviceRead:
    enforce_device_action_rate_limit(request, str(owner_id))
    device = device_service.toggle_device(db, device_id=device_id, owner_id=owner_id)
    device_read = DeviceRead.model_validate(device)
    publish_device_update_from_sync(
        owner_id=owner_id,
        device=device_read,
        source="device_action",
    )
    publish_device_command(device=device, action=_action_for_result_status(device_read.status))
    return device_read
