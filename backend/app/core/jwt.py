from datetime import UTC, datetime, timedelta
from secrets import token_urlsafe

from jose import JWTError, jwt

from app.core.config import settings


def create_access_token(subject: str, role: str) -> str:
    expires_at = datetime.now(UTC) + timedelta(minutes=settings.access_token_expire_minutes)
    payload = {
        settings.auth_jwt_subject_claim: subject,
        settings.auth_jwt_owner_id_claim: subject,
        settings.auth_jwt_role_claim: role,
        settings.auth_jwt_token_type_claim: settings.auth_jwt_access_token_type,
        "exp": expires_at,
    }

    if settings.auth_jwt_issuer:
        payload["iss"] = settings.auth_jwt_issuer
    if settings.auth_jwt_audience:
        payload["aud"] = settings.auth_jwt_audience

    return jwt.encode(
        payload,
        settings.auth_jwt_secret_key,
        algorithm=settings.auth_jwt_algorithm,
    )


def decode_access_token(token: str) -> dict:
    decode_kwargs: dict[str, str] = {}
    if settings.auth_jwt_issuer:
        decode_kwargs["issuer"] = settings.auth_jwt_issuer
    if settings.auth_jwt_audience:
        decode_kwargs["audience"] = settings.auth_jwt_audience

    payload = jwt.decode(
        token,
        settings.auth_jwt_secret_key,
        algorithms=[settings.auth_jwt_algorithm],
        options={"verify_aud": bool(settings.auth_jwt_audience)},
        **decode_kwargs,
    )
    if payload.get(settings.auth_jwt_token_type_claim) != settings.auth_jwt_access_token_type:
        raise JWTError("Invalid token type")
    return payload


def create_refresh_token() -> str:
    return token_urlsafe(48)
