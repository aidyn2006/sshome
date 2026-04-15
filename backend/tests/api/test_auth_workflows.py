import pytest

pytestmark = pytest.mark.integration


def test_auth_workflow_registers_logs_in_refreshes_and_logs_out(integration_client) -> None:
    register_response = integration_client.client.post(
        "/auth/register",
        json={
            "email": "auth-flow@example.com",
            "password": "StrongPass123!",
            "name": "Auth Flow",
            "phone": "+77000000000",
        },
    )
    assert register_response.status_code == 201
    assert register_response.json()["email"] == "auth-flow@example.com"
    assert register_response.json()["is_active"] is True

    duplicate_register_response = integration_client.client.post(
        "/auth/register",
        json={
            "email": "auth-flow@example.com",
            "password": "StrongPass123!",
            "name": "Auth Flow",
        },
    )
    assert duplicate_register_response.status_code == 400
    assert duplicate_register_response.json()["detail"] == "Email already registered"

    login_response = integration_client.client.post(
        "/auth/login",
        json={
            "email": "auth-flow@example.com",
            "password": "StrongPass123!",
        },
    )
    assert login_response.status_code == 200
    login_payload = login_response.json()
    assert login_payload["token_type"] == "bearer"
    assert login_payload["access_token"]
    assert login_payload["refresh_token"]

    auth_headers = integration_client.auth_headers(login_payload["access_token"])

    auth_context_response = integration_client.client.get("/api/v1/auth-context/me", headers=auth_headers)
    assert auth_context_response.status_code == 200
    assert auth_context_response.json()["subject"] == register_response.json()["id"]
    assert auth_context_response.json()["owner_id"] == register_response.json()["id"]
    assert auth_context_response.json()["roles"] == ["USER"]
    assert auth_context_response.json()["token_type"] == "access"

    refresh_response = integration_client.client.post(
        "/auth/refresh",
        json={"refresh_token": login_payload["refresh_token"]},
    )
    assert refresh_response.status_code == 200
    refreshed_access_token = refresh_response.json()["access_token"]
    assert refreshed_access_token

    refreshed_context_response = integration_client.client.get(
        "/api/v1/auth-context/me",
        headers=integration_client.auth_headers(refreshed_access_token),
    )
    assert refreshed_context_response.status_code == 200
    assert refreshed_context_response.json()["owner_id"] == register_response.json()["id"]

    logout_response = integration_client.client.post(
        "/auth/logout",
        json={"refresh_token": login_payload["refresh_token"]},
        headers=auth_headers,
    )
    assert logout_response.status_code == 204

    refresh_after_logout_response = integration_client.client.post(
        "/auth/refresh",
        json={"refresh_token": login_payload["refresh_token"]},
    )
    assert refresh_after_logout_response.status_code == 401
    assert refresh_after_logout_response.json()["detail"] == "Invalid or expired refresh token"


def test_auth_workflow_rejects_invalid_password(integration_client) -> None:
    integration_client.register_user(email="invalid-login@example.com", name="Invalid Login")

    response = integration_client.client.post(
        "/auth/login",
        json={
            "email": "invalid-login@example.com",
            "password": "WrongPass123!",
        },
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid email or password"
