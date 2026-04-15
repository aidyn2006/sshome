import httpx
from fastapi import HTTPException, status

from app.core.config import settings


async def introspect_access_token(token: str) -> dict:
    if not settings.auth_introspection_url:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="AUTH_INTROSPECTION_URL is not configured",
        )

    try:
        async with httpx.AsyncClient(timeout=settings.auth_introspection_timeout_seconds) as client:
            response = await client.post(
                settings.auth_introspection_url,
                headers={
                    "Authorization": f"Bearer {token}",
                    "Accept": "application/json",
                },
                json={"token": token},
            )
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="External auth service is unavailable",
        ) from exc

    if response.status_code in {status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN}:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid access token",
        )

    if response.status_code >= status.HTTP_500_INTERNAL_SERVER_ERROR:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="External auth service is unavailable",
        )

    if response.status_code >= status.HTTP_400_BAD_REQUEST:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token introspection failed",
        )

    try:
        payload = response.json()
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="External auth service returned invalid JSON",
        ) from exc

    if not isinstance(payload, dict):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="External auth service returned unexpected payload",
        )

    if payload.get("active") is False:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Access token is inactive",
        )

    return payload
