from fastapi import APIRouter, status
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError

from app.core.config import settings
from app.db.session import check_db_connection

router = APIRouter()


@router.get("/", tags=["system"])
def root() -> dict[str, str]:
    return {
        "service": settings.app_name,
        "environment": settings.environment,
        "status": "running",
    }


@router.get("/health", tags=["system"], status_code=status.HTTP_200_OK, response_model=None)
def healthcheck() -> dict[str, str] | JSONResponse:
    try:
        check_db_connection()
    except SQLAlchemyError:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={"status": "degraded", "database": "unavailable"},
        )

    return {"status": "ok", "database": "available"}
