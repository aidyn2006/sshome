from datetime import UTC, datetime, timedelta
from secrets import randbelow

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import hash_password, hash_password_reset_code
from app.models.password_reset_code import PasswordResetCode
from app.models.refresh_token import RefreshToken
from app.models.user import User
from app.schemas.auth import (
    PasswordResetConfirmRequest,
    PasswordResetMessageResponse,
    PasswordResetRequest,
    PasswordResetVerifyRequest,
)
from app.services.email_service import send_password_reset_code


PASSWORD_RESET_REQUEST_MESSAGE = "If an account exists, a password reset code has been sent."
PASSWORD_RESET_VALID_MESSAGE = "Password reset code is valid."
PASSWORD_RESET_COMPLETE_MESSAGE = "Password has been reset."


def request_password_reset(payload: PasswordResetRequest, db: Session) -> PasswordResetMessageResponse:
    email = _normalize_email(payload.email)
    user = _find_active_user_by_email(email=email, db=db)

    if not user:
        return PasswordResetMessageResponse(message=PASSWORD_RESET_REQUEST_MESSAGE)

    now = datetime.now(UTC)
    code = _generate_reset_code()
    db.query(PasswordResetCode).filter(
        PasswordResetCode.user_id == user.id,
        PasswordResetCode.used_at.is_(None),
    ).update({"used_at": now}, synchronize_session=False)

    reset_code = PasswordResetCode(
        user_id=user.id,
        code_hash=hash_password_reset_code(email=email, code=code),
        expires_at=now + timedelta(minutes=settings.password_reset_code_expire_minutes),
        created_at=now,
    )
    db.add(reset_code)
    db.commit()

    try:
        send_password_reset_code(
            email=user.email,
            code=code,
            expires_in_minutes=settings.password_reset_code_expire_minutes,
        )
    except Exception as exc:
        reset_code.used_at = datetime.now(UTC)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to send password reset email",
        ) from exc

    return PasswordResetMessageResponse(message=PASSWORD_RESET_REQUEST_MESSAGE)


def verify_password_reset_code(
    payload: PasswordResetVerifyRequest,
    db: Session,
) -> PasswordResetMessageResponse:
    _get_active_reset_code(email=_normalize_email(payload.email), code=payload.code, db=db)
    return PasswordResetMessageResponse(message=PASSWORD_RESET_VALID_MESSAGE)


def confirm_password_reset(
    payload: PasswordResetConfirmRequest,
    db: Session,
) -> PasswordResetMessageResponse:
    email = _normalize_email(payload.email)
    reset_code = _get_active_reset_code(email=email, code=payload.code, db=db)
    user = db.query(User).filter(User.id == reset_code.user_id, User.is_active.is_(True)).first()

    if not user:
        raise _invalid_code_error()

    user.password_hash = hash_password(payload.new_password)
    reset_code.used_at = datetime.now(UTC)
    db.query(RefreshToken).filter(RefreshToken.user_id == user.id).delete(synchronize_session=False)
    db.commit()

    return PasswordResetMessageResponse(message=PASSWORD_RESET_COMPLETE_MESSAGE)


def _generate_reset_code() -> str:
    return f"{randbelow(1_000_000):06d}"


def _normalize_email(email: str) -> str:
    return str(email).strip().lower()


def _find_active_user_by_email(email: str, db: Session) -> User | None:
    return (
        db.query(User)
        .filter(
            func.lower(User.email) == email,
            User.is_active.is_(True),
        )
        .first()
    )


def _get_active_reset_code(email: str, code: str, db: Session) -> PasswordResetCode:
    now = datetime.now(UTC)
    code_hash = hash_password_reset_code(email=email, code=code)
    reset_code = (
        db.query(PasswordResetCode)
        .join(User, User.id == PasswordResetCode.user_id)
        .filter(
            func.lower(User.email) == email,
            User.is_active.is_(True),
            PasswordResetCode.code_hash == code_hash,
            PasswordResetCode.used_at.is_(None),
            PasswordResetCode.expires_at > now,
        )
        .order_by(PasswordResetCode.created_at.desc())
        .first()
    )

    if not reset_code:
        raise _invalid_code_error()

    return reset_code


def _invalid_code_error() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Invalid or expired password reset code",
    )
