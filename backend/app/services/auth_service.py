from datetime import UTC, datetime, timedelta
from secrets import token_urlsafe

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.jwt import create_access_token, create_refresh_token
from app.core.security import hash_password, hash_refresh_token, verify_password
from app.integrations.google_oauth import verify_google_access_token, verify_google_id_token
from app.models.audit_log import AuditLogAction
from app.models.refresh_token import RefreshToken
from app.models.user import User
from app.schemas.auth import GoogleLoginRequest, LoginRequest, LogoutRequest, RefreshRequest, TokenPairResponse
from app.schemas.user import RegisterRequest
from app.services.audit_service import log_action


def register_user(payload: RegisterRequest, db: Session, ip_address: str | None) -> User:
    existing_user = db.query(User).filter(User.email == payload.email).first()
    if existing_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    user = User(
        email=payload.email,
        password_hash=hash_password(payload.password),
        name=payload.name,
        phone=payload.phone,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    log_action(db, action=AuditLogAction.REGISTER, user_id=user.id, ip_address=ip_address)
    return user


def _issue_token_pair(user: User, db: Session) -> TokenPairResponse:
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User is inactive")

    access_token = create_access_token(subject=str(user.id), role=user.role.value)
    refresh_token = create_refresh_token()

    refresh_entity = RefreshToken(
        user_id=user.id,
        token=hash_refresh_token(refresh_token),
        expires_at=datetime.now(UTC) + timedelta(days=settings.refresh_token_expire_days),
    )
    db.add(refresh_entity)
    db.commit()

    return TokenPairResponse(access_token=access_token, refresh_token=refresh_token)


def login_user(payload: LoginRequest, db: Session, ip_address: str | None) -> TokenPairResponse:
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    token_pair = _issue_token_pair(user=user, db=db)
    log_action(db, action=AuditLogAction.LOGIN, user_id=user.id, ip_address=ip_address)
    return token_pair


async def login_with_google(payload: GoogleLoginRequest, db: Session, ip_address: str | None) -> TokenPairResponse:
    if payload.id_token:
        identity = await verify_google_id_token(payload.id_token)
    elif payload.access_token:
        identity = await verify_google_access_token(payload.access_token)
    else:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Google token")

    user = db.query(User).filter(User.email == identity.email).first()

    if user is None:
        user = User(
            email=identity.email,
            password_hash=hash_password(token_urlsafe(32)),
            name=identity.name,
            phone=None,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        log_action(db, action=AuditLogAction.REGISTER, user_id=user.id, ip_address=ip_address)
    elif not user.name:
        user.name = identity.name
        db.commit()
        db.refresh(user)

    token_pair = _issue_token_pair(user=user, db=db)
    log_action(db, action=AuditLogAction.LOGIN, user_id=user.id, ip_address=ip_address)
    return token_pair


def refresh_access_token(payload: RefreshRequest, db: Session) -> TokenPairResponse:
    token_hash = hash_refresh_token(payload.refresh_token)
    token_entity = db.query(RefreshToken).filter(RefreshToken.token == token_hash).first()

    if not token_entity or token_entity.expires_at < datetime.now(UTC):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired refresh token")

    user = db.query(User).filter(User.id == token_entity.user_id).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive")

    # Rotate the refresh token: the presented one is single-use, so a leaked token
    # cannot be replayed after the legitimate client has refreshed.
    db.delete(token_entity)
    db.flush()
    return _issue_token_pair(user=user, db=db)


def logout_user(
    payload: LogoutRequest,
    current_user: User,
    db: Session,
    ip_address: str | None,
) -> None:
    token_entity = (
        db.query(RefreshToken)
        .filter(
            RefreshToken.token == hash_refresh_token(payload.refresh_token),
            RefreshToken.user_id == current_user.id,
        )
        .first()
    )

    if token_entity:
        db.delete(token_entity)
        db.commit()

    log_action(db, action=AuditLogAction.LOGOUT, user_id=current_user.id, ip_address=ip_address)
