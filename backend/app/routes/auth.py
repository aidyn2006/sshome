from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.orm import Session

from app.core.rate_limit import (
    enforce_login_rate_limit,
    enforce_password_reset_request_rate_limit,
    enforce_password_reset_verify_rate_limit,
)
from app.core.deps import get_current_user
from app.core.rate_limit import enforce_login_rate_limit
from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import (
    GoogleLoginRequest,
    LoginRequest,
    LogoutRequest,
    PasswordResetConfirmRequest,
    PasswordResetMessageResponse,
    PasswordResetRequest,
    PasswordResetVerifyRequest,
    RefreshRequest,
    TokenPairResponse,
)
from app.schemas.user import RegisterRequest, UserOut
from app.services.auth_service import login_user, login_with_google, logout_user, refresh_access_token, register_user
from app.services.password_reset_service import (
    confirm_password_reset,
    request_password_reset,
    verify_password_reset_code,
)

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


@router.post(
    "/password-reset/request",
    response_model=PasswordResetMessageResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
def request_password_reset_code(
    payload: PasswordResetRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> PasswordResetMessageResponse:
    enforce_password_reset_request_rate_limit(request, email=payload.email)
    return request_password_reset(payload=payload, db=db)


@router.post("/password-reset/verify", response_model=PasswordResetMessageResponse)
def verify_password_reset(
    payload: PasswordResetVerifyRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> PasswordResetMessageResponse:
    enforce_password_reset_verify_rate_limit(request, email=payload.email)
    return verify_password_reset_code(payload=payload, db=db)


@router.post("/password-reset/confirm", response_model=PasswordResetMessageResponse)
def confirm_password_reset_code(
    payload: PasswordResetConfirmRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> PasswordResetMessageResponse:
    enforce_password_reset_verify_rate_limit(request, email=payload.email)
    return confirm_password_reset(payload=payload, db=db)


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
