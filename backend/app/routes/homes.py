from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.deps import CurrentOwnerId
from app.db.session import get_db
from app.schemas.home import HomeCreate, HomeRead
from app.services import home_service

router = APIRouter(prefix="/homes", tags=["homes"])


@router.post("", response_model=HomeRead, status_code=status.HTTP_201_CREATED)
def create_home(
    payload: HomeCreate,
    owner_id: CurrentOwnerId,
    db: Session = Depends(get_db),
) -> HomeRead:
    return home_service.create_home(db, owner_id=owner_id, payload=payload)


@router.get("", response_model=list[HomeRead])
def list_homes(
    owner_id: CurrentOwnerId,
    db: Session = Depends(get_db),
) -> list[HomeRead]:
    return home_service.list_homes(db, owner_id=owner_id)


@router.get("/{home_id}", response_model=HomeRead)
def get_home(
    home_id: UUID,
    owner_id: CurrentOwnerId,
    db: Session = Depends(get_db),
) -> HomeRead:
    return home_service.get_home_or_404(db, home_id=home_id, owner_id=owner_id)
