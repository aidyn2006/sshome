from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy.orm import Session

from app.core.deps import CurrentOwnerId
from app.core.rate_limit import enforce_device_action_rate_limit
from app.db.session import get_db
from app.schemas.device import DeviceActionRequest, DeviceCreate, DeviceRead
from app.services import device_service
from app.websockets.publisher import publish_device_update_from_sync

router = APIRouter(prefix="/devices", tags=["devices"])


@router.post("", response_model=DeviceRead, status_code=status.HTTP_201_CREATED)
def create_device(
    payload: DeviceCreate,
    owner_id: CurrentOwnerId,
    db: Session = Depends(get_db),
) -> DeviceRead:
    return device_service.create_device(db, owner_id=owner_id, payload=payload)


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
    return device
