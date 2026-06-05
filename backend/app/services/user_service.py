from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import hash_password, verify_password
from app.models.refresh_token import RefreshToken
from app.models.user import User
from app.schemas.user import ChangePasswordRequest, UserUpdateRequest


def update_user_profile(db: Session, user: User, payload: UserUpdateRequest) -> User:
    if payload.name is not None:
        user.name = payload.name
    if payload.phone is not None:
        user.phone = payload.phone
    if payload.favorite_device_ids is not None:
        user.favorite_device_ids = [str(device_id) for device_id in payload.favorite_device_ids]

    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def change_password(db: Session, user: User, payload: ChangePasswordRequest) -> None:
    if not verify_password(payload.current_password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Current password is incorrect",
        )

    user.password_hash = hash_password(payload.new_password)
    # Force re-login everywhere else: old refresh tokens die with the old password.
    db.query(RefreshToken).filter(RefreshToken.user_id == user.id).delete()
    db.add(user)
    db.commit()
