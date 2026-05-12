import asyncio

import pytest
from fastapi import HTTPException

from app.core.config import settings
from app.integrations.google_oauth import GoogleIdentity, verify_google_access_token, verify_google_id_token


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


def test_verify_google_access_token_returns_verified_identity(monkeypatch) -> None:
    monkeypatch.setattr(settings, "google_oauth_client_id", "client-id.apps.googleusercontent.com")

    class FakeResponse:
        status_code = 200

        def raise_for_status(self) -> None:
            return None

        @staticmethod
        def json() -> dict:
            return {
                "sub": "google-subject",
                "email": "verified@example.com",
                "email_verified": True,
                "name": "Verified User",
            }

    class FakeClient:
        def __init__(self, *args, **kwargs) -> None:
            return None

        async def __aenter__(self) -> "FakeClient":
            return self

        async def __aexit__(self, *args) -> None:
            return None

        async def get(self, url: str, headers: dict[str, str]) -> FakeResponse:
            assert url == "https://openidconnect.googleapis.com/v1/userinfo"
            assert headers == {"Authorization": "Bearer google.access.token"}
            return FakeResponse()

    monkeypatch.setattr("app.integrations.google_oauth.httpx.AsyncClient", FakeClient)

    identity = asyncio.run(verify_google_access_token("google.access.token"))

    assert identity == GoogleIdentity(
        email="verified@example.com",
        name="Verified User",
        subject="google-subject",
    )
