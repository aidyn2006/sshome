from datetime import datetime
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.device import Device
from app.models.enums import DeviceAction
from app.models.event import Event
from app.models.home import Home
from app.models.room import Room
from app.services.home_service import get_home_or_404


def create_device_event(*, device_id: UUID, owner_id: UUID, action: DeviceAction) -> Event:
    return Event(
        device_id=device_id,
        owner_id=owner_id,
        action=action,
    )


def _get_owned_device(db: Session, *, device_id: UUID, owner_id: UUID) -> Device:
    statement = select(Device).where(Device.id == device_id, Device.owner_id == owner_id)
    device = db.scalar(statement)
    if device is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Device not found",
        )
    return device


def _validate_time_range(*, date_from: datetime | None, date_to: datetime | None) -> None:
    if date_from is not None and date_to is not None and date_from > date_to:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="date_from must be less than or equal to date_to",
        )


def list_events(
    db: Session,
    *,
    owner_id: UUID,
    device_id: UUID | None = None,
    home_id: UUID | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
) -> list[Event]:
    _validate_time_range(date_from=date_from, date_to=date_to)

    if home_id is not None:
        get_home_or_404(db, home_id=home_id, owner_id=owner_id)

    if device_id is not None:
        _get_owned_device(db, device_id=device_id, owner_id=owner_id)

    statement = (
        select(Event)
        .join(Event.device)
        .join(Device.room)
        .join(Room.home)
        .where(
            Event.owner_id == owner_id,
            Device.owner_id == owner_id,
            Home.owner_id == owner_id,
        )
    )

    if device_id is not None:
        statement = statement.where(Event.device_id == device_id)

    if home_id is not None:
        statement = statement.where(Home.id == home_id)

    if date_from is not None:
        statement = statement.where(Event.timestamp >= date_from)

    if date_to is not None:
        statement = statement.where(Event.timestamp <= date_to)

    statement = statement.order_by(Event.timestamp.desc(), Event.id.desc())
    return list(db.scalars(statement))
