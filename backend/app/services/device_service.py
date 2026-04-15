from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.device import Device
from app.models.enums import DeviceAction, DeviceStatus, DeviceType
from app.models.home import Home
from app.models.room import Room
from app.schemas.device import DeviceCreate
from app.services import event_service
from app.services.home_service import get_home_or_404


def _default_status_for_device_type(device_type: DeviceType) -> DeviceStatus:
    defaults = {
        DeviceType.LIGHT: DeviceStatus.OFF,
        DeviceType.AC: DeviceStatus.OFF,
        DeviceType.DOOR: DeviceStatus.CLOSED,
        DeviceType.TEMP: DeviceStatus.OFF,
    }
    return defaults[device_type]


def _target_status_for_action(*, device_type: DeviceType, action: DeviceAction) -> DeviceStatus:
    supported_actions = {
        DeviceType.LIGHT: {
            DeviceAction.TURN_ON: DeviceStatus.ON,
            DeviceAction.TURN_OFF: DeviceStatus.OFF,
        },
        DeviceType.AC: {
            DeviceAction.TURN_ON: DeviceStatus.ON,
            DeviceAction.TURN_OFF: DeviceStatus.OFF,
        },
        DeviceType.DOOR: {
            DeviceAction.OPEN: DeviceStatus.OPEN,
            DeviceAction.CLOSE: DeviceStatus.CLOSED,
        },
        DeviceType.TEMP: {},
    }

    next_status = supported_actions[device_type].get(action)
    if next_status is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Action {action.value} is not supported for device type {device_type.value}",
        )

    return next_status


def _get_owned_room(db: Session, *, room_id: UUID, owner_id: UUID) -> Room:
    statement = (
        select(Room)
        .join(Room.home)
        .where(
            Room.id == room_id,
            Home.owner_id == owner_id,
        )
    )
    room = db.scalar(statement)
    if room is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Room not found",
        )
    return room


def create_device(db: Session, *, owner_id: UUID, payload: DeviceCreate) -> Device:
    room = _get_owned_room(db, room_id=payload.room_id, owner_id=owner_id)

    device = Device(
        name=payload.name,
        type=payload.type,
        status=_default_status_for_device_type(payload.type),
        room_id=room.id,
        owner_id=owner_id,
    )
    db.add(device)
    db.commit()
    db.refresh(device)
    return device


def list_devices(db: Session, *, owner_id: UUID, home_id: UUID | None = None) -> list[Device]:
    if home_id is not None:
        get_home_or_404(db, home_id=home_id, owner_id=owner_id)

    statement = (
        select(Device)
        .join(Device.room)
        .join(Room.home)
        .where(Device.owner_id == owner_id, Home.owner_id == owner_id)
    )

    if home_id is not None:
        statement = statement.where(Home.id == home_id)

    statement = statement.order_by(Device.created_at.desc(), Device.id.desc())
    return list(db.scalars(statement))


def get_device_or_404(db: Session, *, device_id: UUID, owner_id: UUID) -> Device:
    statement = select(Device).where(Device.id == device_id, Device.owner_id == owner_id)
    device = db.scalar(statement)
    if device is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Device not found",
        )
    return device


def _apply_device_action_to_device(
    db: Session,
    *,
    device: Device,
    owner_id: UUID,
    action: DeviceAction,
) -> Device:
    device.status = _target_status_for_action(device_type=device.type, action=action)

    event = event_service.create_device_event(
        device_id=device.id,
        owner_id=owner_id,
        action=action,
    )
    db.add(event)
    return device


def apply_device_action(
    db: Session,
    *,
    device_id: UUID,
    owner_id: UUID,
    action: DeviceAction,
) -> Device:
    device = get_device_or_404(db, device_id=device_id, owner_id=owner_id)
    _apply_device_action_to_device(db, device=device, owner_id=owner_id, action=action)
    db.commit()
    db.refresh(device)
    return device
