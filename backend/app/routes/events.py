from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.deps import CurrentOwnerId
from app.db.session import get_db
from app.schemas.event import EventRead
from app.services import event_service

router = APIRouter(prefix="/events", tags=["events"])


@router.get("", response_model=list[EventRead])
def list_events(
    owner_id: CurrentOwnerId,
    db: Session = Depends(get_db),
    device_id: UUID | None = Query(default=None),
    home_id: UUID | None = Query(default=None),
    date_from: datetime | None = Query(default=None),
    date_to: datetime | None = Query(default=None),
) -> list[EventRead]:
    return event_service.list_events(
        db,
        owner_id=owner_id,
        device_id=device_id,
        home_id=home_id,
        date_from=date_from,
        date_to=date_to,
    )


@router.get("/device/{device_id}", response_model=list[EventRead])
def list_device_events(
    device_id: UUID,
    owner_id: CurrentOwnerId,
    db: Session = Depends(get_db),
    date_from: datetime | None = Query(default=None),
    date_to: datetime | None = Query(default=None),
) -> list[EventRead]:
    return event_service.list_events(
        db,
        owner_id=owner_id,
        device_id=device_id,
        date_from=date_from,
        date_to=date_to,
    )
