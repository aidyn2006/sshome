from uuid import UUID

from jose import jwt

from app.core.config import settings


def make_access_token(
    owner_id: str | UUID,
    *,
    subject: str | None = None,
    token_type: str | None = None,
    role: str | None = "USER",
    roles: list[str] | None = None,
    extra_claims: dict | None = None,
) -> str:
    claims = {
        settings.auth_jwt_subject_claim: subject or str(owner_id),
        settings.auth_jwt_owner_id_claim: str(owner_id),
    }

    if token_type is not None:
        claims[settings.auth_jwt_token_type_claim] = token_type

    if roles is not None:
        claims[settings.auth_jwt_roles_claim] = roles
    elif role is not None:
        claims[settings.auth_jwt_role_claim] = role

    if extra_claims:
        claims.update(extra_claims)

    return jwt.encode(
        claims,
        settings.auth_jwt_secret_key,
        algorithm=settings.auth_jwt_algorithm,
    )


def make_auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}
