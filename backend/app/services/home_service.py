from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.device import Device
from app.models.home import Home
from app.models.room import Room
from app.schemas.home import HomeCreate, HomeUpdate
from app.services import device_registry


def create_home(db: Session, *, owner_id: UUID, payload: HomeCreate) -> Home:
    home = Home(name=payload.name, owner_id=owner_id)
    db.add(home)
    db.commit()
    db.refresh(home)
    return home


def list_homes(db: Session, *, owner_id: UUID) -> list[Home]:
    statement = select(Home).where(Home.owner_id == owner_id).order_by(Home.created_at.desc(), Home.id.desc())
    return list(db.scalars(statement))


def get_home_or_404(db: Session, *, home_id: UUID, owner_id: UUID) -> Home:
    statement = select(Home).where(Home.id == home_id, Home.owner_id == owner_id)
    home = db.scalar(statement)
    if home is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Home not found",
        )
    return home


def update_home(db: Session, *, home_id: UUID, owner_id: UUID, payload: HomeUpdate) -> Home:
    home = get_home_or_404(db, home_id=home_id, owner_id=owner_id)
    home.name = payload.name
    db.commit()
    db.refresh(home)
    return home


def delete_home(db: Session, *, home_id: UUID, owner_id: UUID) -> None:
    home = get_home_or_404(db, home_id=home_id, owner_id=owner_id)

    # Devices are removed by the DB cascade; their factory ids must be released first.
    hardware_ids = list(
        db.scalars(
            select(Device.hardware_id)
            .join(Device.room)
            .where(Room.home_id == home.id, Device.hardware_id.is_not(None))
        )
    )

    db.delete(home)
    db.commit()

    for hardware_id in hardware_ids:
        device_registry.mark_unclaimed(hardware_id)
