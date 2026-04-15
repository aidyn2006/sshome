from typing import Annotated
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer, OAuth2PasswordBearer
from jose import JWTError
from sqlalchemy.orm import Session

from app.core.auth import authenticate_access_token
from app.core.jwt import decode_access_token
from app.db.session import get_db
from app.models.user import User, UserRole
from app.schemas.auth_context import AuthContext

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")
bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
    )

    try:
        payload = decode_access_token(token)
        user_id = payload.get("sub")
        if not user_id:
            raise credentials_exception
    except (JWTError, ValueError):
        raise credentials_exception

    user = db.query(User).filter(User.id == UUID(user_id)).first()
    if not user or not user.is_active:
        raise credentials_exception
    return user


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return current_user


def _credentials_exception() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
    )


async def get_auth_context(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> AuthContext:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise _credentials_exception()

    return await authenticate_access_token(credentials.credentials)


def get_current_owner_id(auth_context: AuthContext = Depends(get_auth_context)) -> UUID:
    return auth_context.owner_id


CurrentAuth = Annotated[AuthContext, Depends(get_auth_context)]
CurrentOwnerId = Annotated[UUID, Depends(get_current_owner_id)]
