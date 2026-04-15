import asyncio

import pytest
from fastapi import HTTPException

from app.core.auth import authenticate_access_token
from app.core.config import settings
from tests.helpers import make_access_token


def test_authenticate_access_token_uses_sub_as_owner_fallback() -> None:
    owner_id = "550e8400-e29b-41d4-a716-446655440000"
    token = make_access_token(
        owner_id,
        token_type="access",
        extra_claims={settings.auth_jwt_owner_id_claim: None},
    )

    auth_context = asyncio.run(authenticate_access_token(token))

    assert str(auth_context.owner_id) == owner_id
    assert auth_context.subject == owner_id
    assert auth_context.roles == ["USER"]


def test_authenticate_access_token_rejects_wrong_token_type() -> None:
    token = make_access_token(
        "550e8400-e29b-41d4-a716-446655440000",
        token_type="refresh",
    )

    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(authenticate_access_token(token))

    assert exc_info.value.status_code == 401
    assert exc_info.value.detail == "Unsupported token type"


def test_authenticate_access_token_supports_introspection_mode(monkeypatch) -> None:
    monkeypatch.setattr(settings, "auth_mode", "introspection")

    async def fake_introspection(_: str) -> dict:
        return {
            "active": True,
            "owner_id": "550e8400-e29b-41d4-a716-446655440000",
            "sub": "external-user",
            "roles": ["USER"],
            "type": "access",
        }

    monkeypatch.setattr("app.core.auth.introspect_access_token", fake_introspection)

    auth_context = asyncio.run(authenticate_access_token("external-token"))

    assert str(auth_context.owner_id) == "550e8400-e29b-41d4-a716-446655440000"
    assert auth_context.subject == "external-user"
    assert auth_context.auth_mode == "introspection"


def test_authenticate_access_token_requires_uuid_owner_id() -> None:
    token = make_access_token(
        "550e8400-e29b-41d4-a716-446655440000",
        token_type="access",
        extra_claims={settings.auth_jwt_owner_id_claim: "not-a-uuid"},
    )

    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(authenticate_access_token(token))

    assert exc_info.value.status_code == 401
    assert exc_info.value.detail == "Owner identifier must be a UUID"
