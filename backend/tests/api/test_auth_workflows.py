import pytest

from app.integrations.google_oauth import GoogleIdentity

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
    assert register_response.json()["role"] == "USER"
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

    profile_response = integration_client.client.get("/users/me", headers=auth_headers)
    assert profile_response.status_code == 200
    assert profile_response.json()["email"] == "auth-flow@example.com"

    logs_as_user_response = integration_client.client.get("/logs", headers=auth_headers)
    assert logs_as_user_response.status_code == 403
    assert logs_as_user_response.json()["detail"] == "Admin access required"

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


def test_auth_workflow_ignores_requested_role_and_registers_user(integration_client) -> None:
    # Self-registration must never grant ADMIN: the role field is ignored,
    # admins are promoted via the admin endpoint only.
    register_response = integration_client.client.post(
        "/auth/register",
        json={
            "email": "admin-flow@example.com",
            "password": "StrongPass123!",
            "name": "Admin Flow",
            "phone": "+77000000001",
            "role": "ADMIN",
        },
    )

    assert register_response.status_code == 201
    assert register_response.json()["role"] == "USER"

    login_response = integration_client.client.post(
        "/auth/login",
        json={
            "email": "admin-flow@example.com",
            "password": "StrongPass123!",
        },
    )
    assert login_response.status_code == 200

    auth_context_response = integration_client.client.get(
        "/api/v1/auth-context/me",
        headers=integration_client.auth_headers(login_response.json()["access_token"]),
    )
    assert auth_context_response.status_code == 200
    assert auth_context_response.json()["roles"] == ["USER"]


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


def test_password_reset_workflow_sends_code_and_updates_password(integration_client, monkeypatch) -> None:
    sent_codes: list[dict[str, str | int]] = []

    def fake_send_password_reset_code(email: str, code: str, expires_in_minutes: int) -> None:
        sent_codes.append(
            {
                "email": email,
                "code": code,
                "expires_in_minutes": expires_in_minutes,
            }
        )

    monkeypatch.setattr("app.services.password_reset_service.send_password_reset_code", fake_send_password_reset_code)
    integration_client.register_user(email="reset-flow@example.com", password="OldStrongPass123!")

    request_response = integration_client.client.post(
        "/auth/password-reset/request",
        json={"email": "reset-flow@example.com"},
    )
    assert request_response.status_code == 202
    assert request_response.json()["message"] == "If an account exists, a password reset code has been sent."
    assert len(sent_codes) == 1
    assert sent_codes[0]["email"] == "reset-flow@example.com"
    assert isinstance(sent_codes[0]["code"], str)

    verify_response = integration_client.client.post(
        "/auth/password-reset/verify",
        json={"email": "reset-flow@example.com", "code": sent_codes[0]["code"]},
    )
    assert verify_response.status_code == 200
    assert verify_response.json()["message"] == "Password reset code is valid."

    confirm_response = integration_client.client.post(
        "/auth/password-reset/confirm",
        json={
            "email": "reset-flow@example.com",
            "code": sent_codes[0]["code"],
            "new_password": "NewStrongPass123!",
        },
    )
    assert confirm_response.status_code == 200
    assert confirm_response.json()["message"] == "Password has been reset."

    old_login_response = integration_client.client.post(
        "/auth/login",
        json={
            "email": "reset-flow@example.com",
            "password": "OldStrongPass123!",
        },
    )
    assert old_login_response.status_code == 401

    new_login_response = integration_client.client.post(
        "/auth/login",
        json={
            "email": "reset-flow@example.com",
            "password": "NewStrongPass123!",
        },
    )
    assert new_login_response.status_code == 200

    reused_code_response = integration_client.client.post(
        "/auth/password-reset/confirm",
        json={
            "email": "reset-flow@example.com",
            "code": sent_codes[0]["code"],
            "new_password": "AnotherStrongPass123!",
        },
    )
    assert reused_code_response.status_code == 400
    assert reused_code_response.json()["detail"] == "Invalid or expired password reset code"


def test_password_reset_request_does_not_reveal_unknown_email(integration_client, monkeypatch) -> None:
    sent_codes: list[str] = []

    def fake_send_password_reset_code(email: str, code: str, expires_in_minutes: int) -> None:
        sent_codes.append(code)

    monkeypatch.setattr("app.services.password_reset_service.send_password_reset_code", fake_send_password_reset_code)

    response = integration_client.client.post(
        "/auth/password-reset/request",
        json={"email": "missing-reset@example.com"},
    )

    assert response.status_code == 202
    assert response.json()["message"] == "If an account exists, a password reset code has been sent."
    assert sent_codes == []


def test_google_auth_workflow_creates_user_and_returns_tokens(integration_client, monkeypatch) -> None:
    async def fake_verify_google_id_token(id_token: str) -> GoogleIdentity:
        assert id_token == "google.jwt.identity.token"
        return GoogleIdentity(email="google-user@example.com", name="Google User", subject="google-subject")

    monkeypatch.setattr("app.services.auth_service.verify_google_id_token", fake_verify_google_id_token)

    response = integration_client.client.post("/auth/google", json={"id_token": "google.jwt.identity.token"})

    assert response.status_code == 200
    payload = response.json()
    assert payload["token_type"] == "bearer"
    assert payload["access_token"]
    assert payload["refresh_token"]

    profile_response = integration_client.client.get(
        "/users/me",
        headers=integration_client.auth_headers(payload["access_token"]),
    )

    assert profile_response.status_code == 200
    assert profile_response.json()["email"] == "google-user@example.com"
    assert profile_response.json()["name"] == "Google User"
