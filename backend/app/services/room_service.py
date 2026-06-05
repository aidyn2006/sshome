from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.device import Device
from app.models.home import Home
from app.models.room import Room
from app.schemas.room import RoomCreate, RoomUpdate
from app.services import device_registry


def _get_owned_home(db: Session, *, home_id: UUID, owner_id: UUID) -> Home:
    statement = select(Home).where(Home.id == home_id, Home.owner_id == owner_id)
    home = db.scalar(statement)
    if home is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Home not found",
        )
    return home


def create_room(db: Session, *, owner_id: UUID, payload: RoomCreate) -> Room:
    home = _get_owned_home(db, home_id=payload.home_id, owner_id=owner_id)

    room = Room(name=payload.name, home_id=home.id)
    db.add(room)
    db.commit()
    db.refresh(room)
    return room


def list_rooms(db: Session, *, owner_id: UUID, home_id: UUID | None = None) -> list[Room]:
    if home_id is not None:
        _get_owned_home(db, home_id=home_id, owner_id=owner_id)

    statement = select(Room).join(Room.home).where(Home.owner_id == owner_id)
    if home_id is not None:
        statement = statement.where(Room.home_id == home_id)

    statement = statement.order_by(Room.created_at.desc(), Room.id.desc())
    return list(db.scalars(statement))


def get_room_or_404(db: Session, *, room_id: UUID, owner_id: UUID) -> Room:
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


def update_room(db: Session, *, room_id: UUID, owner_id: UUID, payload: RoomUpdate) -> Room:
    room = get_room_or_404(db, room_id=room_id, owner_id=owner_id)
    room.name = payload.name
    db.commit()
    db.refresh(room)
    return room


def delete_room(db: Session, *, room_id: UUID, owner_id: UUID) -> None:
    room = get_room_or_404(db, room_id=room_id, owner_id=owner_id)

    # Devices are removed by the DB cascade; their factory ids must be released first.
    hardware_ids = list(
        db.scalars(
            select(Device.hardware_id).where(
                Device.room_id == room.id,
                Device.hardware_id.is_not(None),
            )
        )
    )

    db.delete(room)
    db.commit()

    for hardware_id in hardware_ids:
        device_registry.mark_unclaimed(hardware_id)
