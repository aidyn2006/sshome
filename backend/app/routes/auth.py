from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import (
    GoogleLoginRequest,
    LoginRequest,
    LogoutRequest,
    RefreshRequest,
    TokenPairResponse,
)
from app.schemas.user import RegisterRequest, UserOut
from app.services.auth_service import login_user, login_with_google, logout_user, refresh_access_token, register_user

router = APIRouter()


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, request: Request, db: Session = Depends(get_db)) -> UserOut:
    user = register_user(payload=payload, db=db, ip_address=request.client.host if request.client else None)
    return UserOut.model_validate(user)


@router.post("/login", response_model=TokenPairResponse)
def login(payload: LoginRequest, request: Request, db: Session = Depends(get_db)) -> TokenPairResponse:
    enforce_login_rate_limit(request, email=payload.email)
    return login_user(payload=payload, db=db, ip_address=request.client.host if request.client else None)


@router.post("/google", response_model=TokenPairResponse)
async def google_login(
    payload: GoogleLoginRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> TokenPairResponse:
    return await login_with_google(payload=payload, db=db, ip_address=request.client.host if request.client else None)


@router.post("/refresh", response_model=TokenPairResponse)
def refresh(payload: RefreshRequest, db: Session = Depends(get_db)) -> TokenPairResponse:
    return refresh_access_token(payload=payload, db=db)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    payload: LogoutRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    logout_user(
        payload=payload,
        current_user=current_user,
        db=db,
        ip_address=request.client.host if request.client else None,
    )
    return None
