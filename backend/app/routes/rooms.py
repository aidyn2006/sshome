from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.deps import CurrentOwnerId
from app.db.session import get_db
from app.schemas.room import RoomCreate, RoomRead, RoomUpdate
from app.services import room_service

router = APIRouter(prefix="/rooms", tags=["rooms"])


@router.post("", response_model=RoomRead, status_code=status.HTTP_201_CREATED)
def create_room(
    payload: RoomCreate,
    owner_id: CurrentOwnerId,
    db: Session = Depends(get_db),
) -> RoomRead:
    return room_service.create_room(db, owner_id=owner_id, payload=payload)


@router.get("", response_model=list[RoomRead])
def list_rooms(
    owner_id: CurrentOwnerId,
    db: Session = Depends(get_db),
    home_id: UUID | None = Query(default=None),
) -> list[RoomRead]:
    return room_service.list_rooms(db, owner_id=owner_id, home_id=home_id)


@router.get("/{room_id}", response_model=RoomRead)
def get_room(
    room_id: UUID,
    owner_id: CurrentOwnerId,
    db: Session = Depends(get_db),
) -> RoomRead:
    return room_service.get_room_or_404(db, room_id=room_id, owner_id=owner_id)


@router.patch("/{room_id}", response_model=RoomRead)
def update_room(
    room_id: UUID,
    payload: RoomUpdate,
    owner_id: CurrentOwnerId,
    db: Session = Depends(get_db),
) -> RoomRead:
    return room_service.update_room(db, room_id=room_id, owner_id=owner_id, payload=payload)


@router.delete("/{room_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_room(
    room_id: UUID,
    owner_id: CurrentOwnerId,
    db: Session = Depends(get_db),
) -> None:
    room_service.delete_room(db, room_id=room_id, owner_id=owner_id)
