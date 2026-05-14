import hashlib
import secrets
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.device import Device
from app.models.enums import DeviceAction, DeviceStatus, DeviceType
from app.models.home import Home
from app.models.room import Room
from app.schemas.device import DeviceCreate
from app.services import device_registry, event_service
from app.services.home_service import get_home_or_404


def verify_device_secret(plain: str, stored_hash: str) -> bool:
    expected = hashlib.sha256(plain.encode()).hexdigest()
    return secrets.compare_digest(expected, stored_hash)


def _default_status_for_device_type(device_type: DeviceType) -> DeviceStatus:
    defaults = {
        DeviceType.LIGHT: DeviceStatus.OFF,
        DeviceType.AC: DeviceStatus.OFF,
        DeviceType.DOOR: DeviceStatus.CLOSED,
        DeviceType.TEMP: DeviceStatus.OFF,
        DeviceType.CAMERA: DeviceStatus.OFF,
        DeviceType.MOTION: DeviceStatus.OFF,
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
        DeviceType.CAMERA: {},
        DeviceType.MOTION: {},
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


def _ensure_hardware_id_available(db: Session, *, hardware_id: str | None) -> None:
    if hardware_id is None:
        return

    existing_device = db.scalar(select(Device).where(Device.hardware_id == hardware_id))
    if existing_device is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Device ID is already linked to an account",
        )


def create_device(db: Session, *, owner_id: UUID, payload: DeviceCreate) -> tuple[Device, None]:
    """Returns (device, None). Secret is pre-generated at factory time — not returned here."""
    room = _get_owned_room(db, room_id=payload.room_id, owner_id=owner_id)
    _ensure_hardware_id_available(db, hardware_id=payload.hardware_id)

    if payload.hardware_id:
        if not device_registry.is_known_device(payload.hardware_id):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="This device ID was not found in our registry. Make sure you typed it correctly.",
            )
        if device_registry.is_claimed(payload.hardware_id):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This device is already linked to another account.",
            )

    secret_hash = device_registry.get_secret_hash(payload.hardware_id) if payload.hardware_id else None

    device = Device(
        name=payload.name,
        type=payload.type,
        status=_default_status_for_device_type(payload.type),
        hardware_id=payload.hardware_id,
        device_secret_hash=secret_hash,
        room_id=room.id,
        owner_id=owner_id,
    )
    db.add(device)
    db.commit()
    db.refresh(device)

    if payload.hardware_id:
        device_registry.mark_claimed(payload.hardware_id)

    return device, None


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


def toggle_device(db: Session, *, device_id: UUID, owner_id: UUID) -> Device:
    device = get_device_or_404(db, device_id=device_id, owner_id=owner_id)
    next_action_by_status = {
        DeviceStatus.ON: DeviceAction.TURN_OFF,
        DeviceStatus.OFF: DeviceAction.TURN_ON,
        DeviceStatus.OPEN: DeviceAction.CLOSE,
        DeviceStatus.CLOSED: DeviceAction.OPEN,
    }
    action = next_action_by_status.get(device.status)
    if action is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Device status {device.status.value} cannot be toggled",
        )

    _apply_device_action_to_device(db, device=device, owner_id=owner_id, action=action)
    db.commit()
    db.refresh(device)
    return device


def delete_device(db: Session, *, device_id: UUID, owner_id: UUID) -> None:
    device = get_device_or_404(db, device_id=device_id, owner_id=owner_id)
    db.delete(device)
    db.commit()
