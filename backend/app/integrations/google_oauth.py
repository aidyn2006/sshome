from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

import httpx
from fastapi import HTTPException, status
from jose import JWTError, jwt

from app.core.config import settings


@dataclass(frozen=True)
class GoogleIdentity:
    email: str
    name: str
    subject: str


_jwks_cache: dict | None = None
_jwks_cache_expires_at: datetime | None = None


async def _get_google_jwks() -> dict:
    global _jwks_cache, _jwks_cache_expires_at

    now = datetime.now(UTC)
    if _jwks_cache and _jwks_cache_expires_at and _jwks_cache_expires_at > now:
        return _jwks_cache

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(settings.google_oauth_jwks_url)
            response.raise_for_status()
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google authentication is temporarily unavailable",
        ) from exc

    try:
        jwks = response.json()
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google authentication returned invalid key data",
        ) from exc

    _jwks_cache = jwks
    _jwks_cache_expires_at = now + timedelta(seconds=settings.google_oauth_jwks_cache_seconds)
    return jwks


def _select_key(jwks: dict, key_id: str | None) -> dict:
    for key in jwks.get("keys", []):
        if key.get("kid") == key_id:
            return key

    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Google token")


async def verify_google_id_token(id_token: str) -> GoogleIdentity:
    if not settings.google_oauth_client_id:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google authentication is not configured",
        )

    try:
        header = jwt.get_unverified_header(id_token)
    except JWTError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Google token") from exc

    jwks = await _get_google_jwks()
    key = _select_key(jwks, header.get("kid"))

    try:
        claims = jwt.decode(
            id_token,
            key,
            algorithms=["RS256"],
            audience=settings.google_oauth_client_id,
            options={"verify_aud": True},
        )
    except JWTError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Google token") from exc

    issuer = claims.get("iss")
    if issuer not in {"accounts.google.com", "https://accounts.google.com"}:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Google token")

    email = claims.get("email")
    if not email or not claims.get("email_verified"):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Google email is not verified")

    name = claims.get("name") or email.split("@", maxsplit=1)[0]
    subject = claims.get("sub")
    if not subject:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Google token")

    return GoogleIdentity(email=email, name=name, subject=subject)


async def verify_google_access_token(access_token: str) -> GoogleIdentity:
    if not settings.google_oauth_client_id:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google authentication is not configured",
        )

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(
                "https://openidconnect.googleapis.com/v1/userinfo",
                headers={"Authorization": f"Bearer {access_token}"},
            )
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google authentication is temporarily unavailable",
        ) from exc

    if response.status_code == status.HTTP_401_UNAUTHORIZED:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Google token")

    try:
        response.raise_for_status()
        claims = response.json()
    except (httpx.HTTPError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google authentication is temporarily unavailable",
        ) from exc

    email = claims.get("email")
    email_verified = claims.get("email_verified")
    if isinstance(email_verified, str):
        email_verified = email_verified.lower() == "true"

    if not email or not email_verified:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Google email is not verified")

    subject = claims.get("sub")
    if not subject:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Google token")

    return GoogleIdentity(
        email=email,
        name=claims.get("name") or email.split("@", maxsplit=1)[0],
        subject=subject,
    )
