from uuid import UUID

from fastapi import HTTPException, status
from jose import JWTError, jwt

from app.core.config import settings
from app.integrations.auth_client import introspect_access_token
from app.schemas.auth_context import AuthContext


def _credentials_exception(detail: str = "Could not validate credentials") -> HTTPException:
    return HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=detail)


def _extract_owner_id(claims: dict) -> UUID:
    owner_value = claims.get(settings.auth_jwt_owner_id_claim) or claims.get(settings.auth_jwt_subject_claim)
    if not owner_value:
        raise _credentials_exception("Token is missing owner identifier")

    try:
        return UUID(str(owner_value))
    except ValueError as exc:
        raise _credentials_exception("Owner identifier must be a UUID") from exc


def _extract_subject(claims: dict) -> str | None:
    subject = claims.get(settings.auth_jwt_subject_claim)
    return str(subject) if subject is not None else None


def _extract_roles(claims: dict) -> list[str]:
    roles = claims.get(settings.auth_jwt_roles_claim)
    if isinstance(roles, list):
        return [str(role) for role in roles]
    if isinstance(roles, str) and roles.strip():
        return [roles]

    role = claims.get(settings.auth_jwt_role_claim)
    if isinstance(role, str) and role.strip():
        return [role]

    return []


def _extract_token_type(claims: dict) -> str | None:
    token_type = claims.get(settings.auth_jwt_token_type_claim)
    return str(token_type) if token_type is not None else None


def _build_auth_context(claims: dict, auth_mode: str) -> AuthContext:
    token_type = _extract_token_type(claims)
    expected_token_type = settings.auth_jwt_access_token_type

    if token_type is not None and expected_token_type and token_type != expected_token_type:
        raise _credentials_exception("Unsupported token type")

    return AuthContext(
        owner_id=_extract_owner_id(claims),
        subject=_extract_subject(claims),
        roles=_extract_roles(claims),
        token_type=token_type,
        auth_mode=auth_mode,
        claims=claims,
    )


def _authenticate_jwt(token: str) -> AuthContext:
    decode_kwargs: dict[str, str] = {}
    if settings.auth_jwt_issuer:
        decode_kwargs["issuer"] = settings.auth_jwt_issuer
    if settings.auth_jwt_audience:
        decode_kwargs["audience"] = settings.auth_jwt_audience

    options = {"verify_aud": bool(settings.auth_jwt_audience)}

    try:
        claims = jwt.decode(
            token,
            settings.auth_jwt_secret_key,
            algorithms=[settings.auth_jwt_algorithm],
            options=options,
            **decode_kwargs,
        )
    except JWTError as exc:
        raise _credentials_exception("Invalid access token") from exc

    return _build_auth_context(claims=claims, auth_mode="jwt")


async def authenticate_access_token(token: str) -> AuthContext:
    if settings.auth_mode == "jwt":
        return _authenticate_jwt(token)

    if settings.auth_mode == "introspection":
        claims = await introspect_access_token(token)
        return _build_auth_context(claims=claims, auth_mode="introspection")

    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail=f"Unsupported auth mode: {settings.auth_mode}",
    )
