from sqlalchemy.orm import Session

from app.models.user import User
from app.schemas.user import UserUpdateRequest


def update_user_profile(db: Session, user: User, payload: UserUpdateRequest) -> User:
    if payload.name is not None:
        user.name = payload.name
    if payload.phone is not None:
        user.phone = payload.phone

    db.add(user)
    db.commit()
    db.refresh(user)
    return user
