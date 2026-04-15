from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.home import Home
from app.schemas.home import HomeCreate


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
