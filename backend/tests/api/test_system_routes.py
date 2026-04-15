from app.core.config import settings
from sqlalchemy.exc import SQLAlchemyError

from tests.helpers import make_access_token, make_auth_headers


def test_root_returns_service_metadata(client) -> None:
    response = client.get("/")

    assert response.status_code == 200
    assert response.json()["service"] == settings.app_name
    assert response.json()["status"] == "running"


def test_root_includes_security_headers(client) -> None:
    response = client.get("/")

    assert response.status_code == 200
    assert response.headers["x-content-type-options"] == "nosniff"
    assert response.headers["x-frame-options"] == "DENY"
    assert response.headers["referrer-policy"] == "no-referrer"
    assert response.headers["cache-control"] == "no-store"
    assert response.headers["permissions-policy"] == "camera=(), microphone=(), geolocation=()"


def test_health_returns_ok_when_db_is_available(client, monkeypatch) -> None:
    monkeypatch.setattr("app.routes.system.check_db_connection", lambda: True)

    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "database": "available"}


def test_health_returns_503_when_db_is_unavailable(client, monkeypatch) -> None:
    def broken_db_check() -> None:
        raise SQLAlchemyError("db down")

    monkeypatch.setattr("app.routes.system.check_db_connection", broken_db_check)

    response = client.get("/health")

    assert response.status_code == 503
    assert response.json() == {"status": "degraded", "database": "unavailable"}


def test_auth_context_route_returns_owner_id_from_token(client) -> None:
    owner_id = "550e8400-e29b-41d4-a716-446655440000"
    token = make_access_token(owner_id, token_type="access", roles=["USER", "ADMIN"])

    response = client.get("/api/v1/auth-context/me", headers=make_auth_headers(token))

    assert response.status_code == 200
    assert response.json() == {
        "owner_id": owner_id,
        "subject": owner_id,
        "roles": ["USER", "ADMIN"],
        "token_type": "access",
        "auth_mode": "jwt",
    }


def test_auth_context_route_requires_bearer_token(client) -> None:
    response = client.get("/api/v1/auth-context/me")

    assert response.status_code == 401
    assert response.json()["detail"] == "Could not validate credentials"
