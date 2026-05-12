import asyncio

import pytest
from fastapi import HTTPException

from app.core.config import settings
from app.integrations.google_oauth import GoogleIdentity, verify_google_id_token


def test_verify_google_id_token_requires_client_id(monkeypatch) -> None:
    monkeypatch.setattr(settings, "google_oauth_client_id", None)

    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(verify_google_id_token("google.jwt.identity.token"))

    assert exc_info.value.status_code == 503
    assert exc_info.value.detail == "Google authentication is not configured"


def test_verify_google_id_token_returns_verified_identity(monkeypatch) -> None:
    monkeypatch.setattr(settings, "google_oauth_client_id", "client-id.apps.googleusercontent.com")
    monkeypatch.setattr(
        "app.integrations.google_oauth.jwt.get_unverified_header",
        lambda id_token: {"kid": "test-key"},
    )

    async def fake_get_google_jwks() -> dict:
        return {"keys": [{"kid": "test-key", "kty": "RSA"}]}

    def fake_decode(*args, **kwargs) -> dict:
        assert kwargs["audience"] == "client-id.apps.googleusercontent.com"
        return {
            "iss": "https://accounts.google.com",
            "sub": "google-subject",
            "email": "verified@example.com",
            "email_verified": True,
            "name": "Verified User",
        }

    monkeypatch.setattr("app.integrations.google_oauth._get_google_jwks", fake_get_google_jwks)
    monkeypatch.setattr("app.integrations.google_oauth.jwt.decode", fake_decode)

    identity = asyncio.run(verify_google_id_token("google.jwt.identity.token"))

    assert identity == GoogleIdentity(
        email="verified@example.com",
        name="Verified User",
        subject="google-subject",
    )
