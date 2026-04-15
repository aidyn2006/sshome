from fastapi import APIRouter, Depends

from app.core.deps import get_auth_context
from app.schemas.auth_context import AuthContext

router = APIRouter(prefix="/auth-context", tags=["auth-context"])


@router.get("/me", response_model=AuthContext)
async def read_auth_context(auth_context: AuthContext = Depends(get_auth_context)) -> AuthContext:
    return auth_context
