from datetime import UTC, datetime
from types import SimpleNamespace
from uuid import UUID, uuid4

import pytest

from app.core.config import settings
from app.core.deps import get_current_owner_id
from app.db.session import get_db
from app.models.enums import DeviceAction, DeviceType


def _override_dependencies(client, owner_id: UUID, db: object) -> None:
    client.app.dependency_overrides[get_current_owner_id] = lambda: owner_id
    client.app.dependency_overrides[get_db] = lambda: db


def _clear_overrides(client) -> None:
    client.app.dependency_overrides.clear()


def _iso_utc(value: datetime) -> str:
    return value.isoformat().replace("+00:00", "Z")


def test_create_device_sets_owner_scope_and_serializes_response(client, monkeypatch) -> None:
    owner_id = UUID("550e8400-e29b-41d4-a716-446655440000")
    fake_db = object()
    room_id = uuid4()
    device_id = uuid4()
    created_at = datetime(2026, 4, 15, 12, 0, tzinfo=UTC)
    updated_at = datetime(2026, 4, 15, 12, 5, tzinfo=UTC)

    _override_dependencies(client, owner_id, fake_db)

    def fake_create_device(db, *, owner_id, payload):
        assert db is fake_db
        assert owner_id == owner_id_value
        assert payload.name == "Main Light"
        assert payload.room_id == room_id
        assert payload.type == DeviceType.LIGHT
        return SimpleNamespace(
            id=device_id,
            name=payload.name,
            type=payload.type,
            status="OFF",
            room_id=payload.room_id,
            owner_id=owner_id,
            created_at=created_at,
            updated_at=updated_at,
        )

    owner_id_value = owner_id
    monkeypatch.setattr("app.routes.devices.device_service.create_device", fake_create_device)

    response = client.post(
        "/api/v1/devices",
        json={"name": "Main Light", "type": "LIGHT", "room_id": str(room_id)},
    )

    _clear_overrides(client)

    assert response.status_code == 201
    assert response.json() == {
        "id": str(device_id),
        "name": "Main Light",
        "type": "LIGHT",
        "status": "OFF",
        "room_id": str(room_id),
        "owner_id": str(owner_id),
        "created_at": _iso_utc(created_at),
        "updated_at": _iso_utc(updated_at),
    }


def test_list_devices_supports_home_filter(client, monkeypatch) -> None:
    owner_id = UUID("550e8400-e29b-41d4-a716-446655440000")
    fake_db = object()
    home_id = uuid4()
    room_id = uuid4()
    device_id = uuid4()
    created_at = datetime(2026, 4, 15, 12, 0, tzinfo=UTC)
    updated_at = datetime(2026, 4, 15, 12, 5, tzinfo=UTC)
    device = SimpleNamespace(
        id=device_id,
        name="Bedroom AC",
        type="AC",
        status="OFF",
        room_id=room_id,
        owner_id=owner_id,
        created_at=created_at,
        updated_at=updated_at,
    )

    _override_dependencies(client, owner_id, fake_db)

    def fake_list_devices(db, *, owner_id, home_id=None):
        assert db is fake_db
        assert owner_id == owner_id_value
        assert home_id == home_id_value
        return [device]

    owner_id_value = owner_id
    home_id_value = home_id
    monkeypatch.setattr("app.routes.devices.device_service.list_devices", fake_list_devices)

    response = client.get(f"/api/v1/devices?home_id={home_id}")

    _clear_overrides(client)

    assert response.status_code == 200
    assert response.json() == [
        {
            "id": str(device_id),
            "name": "Bedroom AC",
            "type": "AC",
            "status": "OFF",
            "room_id": str(room_id),
            "owner_id": str(owner_id),
            "created_at": _iso_utc(created_at),
            "updated_at": _iso_utc(updated_at),
        }
    ]


def test_get_device_passes_owner_scope_to_service(client, monkeypatch) -> None:
    owner_id = UUID("550e8400-e29b-41d4-a716-446655440000")
    fake_db = object()
    device_id = uuid4()
    room_id = uuid4()
    created_at = datetime(2026, 4, 15, 12, 0, tzinfo=UTC)
    updated_at = datetime(2026, 4, 15, 12, 5, tzinfo=UTC)

    _override_dependencies(client, owner_id, fake_db)

    def fake_get_device(db, *, device_id, owner_id):
        assert db is fake_db
        assert device_id == device_id_value
        assert owner_id == owner_id_value
        return SimpleNamespace(
            id=device_id,
            name="Front Door",
            type="DOOR",
            status="CLOSED",
            room_id=room_id,
            owner_id=owner_id,
            created_at=created_at,
            updated_at=updated_at,
        )

    device_id_value = device_id
    owner_id_value = owner_id
    monkeypatch.setattr("app.routes.devices.device_service.get_device_or_404", fake_get_device)

    response = client.get(f"/api/v1/devices/{device_id}")

    _clear_overrides(client)

    assert response.status_code == 200
    assert response.json()["id"] == str(device_id)
    assert response.json()["owner_id"] == str(owner_id)


def test_apply_device_action_passes_command_to_service(client, monkeypatch) -> None:
    owner_id = UUID("550e8400-e29b-41d4-a716-446655440000")
    fake_db = object()
    device_id = uuid4()
    room_id = uuid4()
    created_at = datetime(2026, 4, 15, 12, 0, tzinfo=UTC)
    updated_at = datetime(2026, 4, 15, 12, 5, tzinfo=UTC)

    _override_dependencies(client, owner_id, fake_db)

    def fake_apply_device_action(db, *, device_id, owner_id, action):
        assert db is fake_db
        assert device_id == device_id_value
        assert owner_id == owner_id_value
        assert action == DeviceAction.TURN_ON
        return SimpleNamespace(
            id=device_id,
            name="Main Light",
            type="LIGHT",
            status="ON",
            room_id=room_id,
            owner_id=owner_id,
            created_at=created_at,
            updated_at=updated_at,
        )

    device_id_value = device_id
    owner_id_value = owner_id
    monkeypatch.setattr("app.routes.devices.device_service.apply_device_action", fake_apply_device_action)

    response = client.post(
        f"/api/v1/devices/{device_id}/action",
        json={"action": "TURN_ON"},
    )

    _clear_overrides(client)

    assert response.status_code == 200
    assert response.json() == {
        "id": str(device_id),
        "name": "Main Light",
        "type": "LIGHT",
        "status": "ON",
        "room_id": str(room_id),
        "owner_id": str(owner_id),
        "created_at": _iso_utc(created_at),
        "updated_at": _iso_utc(updated_at),
    }


@pytest.mark.parametrize(
    ("method", "path", "payload"),
    [
        ("post", "/api/v1/devices", {"name": "Main Light", "type": "LIGHT", "room_id": str(uuid4())}),
        ("get", "/api/v1/devices", None),
        ("get", f"/api/v1/devices/{uuid4()}", None),
        ("post", f"/api/v1/devices/{uuid4()}/action", {"action": "TURN_ON"}),
    ],
)
def test_device_routes_require_authentication(client, method: str, path: str, payload: dict | None) -> None:
    request = getattr(client, method)
    response = request(path, json=payload) if payload is not None else request(path)

    assert response.status_code == 401
    assert response.json()["detail"] == "Could not validate credentials"


def test_create_device_rejects_invalid_device_type_before_service_call(client, monkeypatch) -> None:
    owner_id = UUID("550e8400-e29b-41d4-a716-446655440000")
    fake_db = object()
    room_id = uuid4()
    _override_dependencies(client, owner_id, fake_db)

    called = False

    def fake_create_device(*args, **kwargs):
        nonlocal called
        called = True

    monkeypatch.setattr("app.routes.devices.device_service.create_device", fake_create_device)

    response = client.post(
        "/api/v1/devices",
        json={"name": "Main Light", "type": "SPEAKER", "room_id": str(room_id)},
    )

    _clear_overrides(client)

    assert response.status_code == 422
    assert called is False


def test_apply_device_action_rejects_invalid_action_before_service_call(client, monkeypatch) -> None:
    owner_id = UUID("550e8400-e29b-41d4-a716-446655440000")
    fake_db = object()
    device_id = uuid4()
    _override_dependencies(client, owner_id, fake_db)

    called = False

    def fake_apply_device_action(*args, **kwargs):
        nonlocal called
        called = True

    monkeypatch.setattr("app.routes.devices.device_service.apply_device_action", fake_apply_device_action)

    response = client.post(
        f"/api/v1/devices/{device_id}/action",
        json={"action": "LOCK"},
    )

    _clear_overrides(client)

    assert response.status_code == 422
    assert called is False


def test_apply_device_action_enforces_rate_limit(client, monkeypatch) -> None:
    owner_id = UUID("550e8400-e29b-41d4-a716-446655440000")
    fake_db = object()
    device_id = uuid4()
    room_id = uuid4()
    created_at = datetime(2026, 4, 15, 12, 0, tzinfo=UTC)
    updated_at = datetime(2026, 4, 15, 12, 5, tzinfo=UTC)
    _override_dependencies(client, owner_id, fake_db)
    monkeypatch.setattr(settings, "security_device_action_rate_limit", 1)

    calls = 0

    def fake_apply_device_action(db, *, device_id, owner_id, action):
        nonlocal calls
        calls += 1
        return SimpleNamespace(
            id=device_id,
            name="Main Light",
            type="LIGHT",
            status="ON",
            room_id=room_id,
            owner_id=owner_id,
            created_at=created_at,
            updated_at=updated_at,
        )

    monkeypatch.setattr("app.routes.devices.device_service.apply_device_action", fake_apply_device_action)
    monkeypatch.setattr("app.routes.devices.publish_device_update_from_sync", lambda **kwargs: None)

    first_response = client.post(
        f"/api/v1/devices/{device_id}/action",
        json={"action": "TURN_ON"},
    )
    second_response = client.post(
        f"/api/v1/devices/{device_id}/action",
        json={"action": "TURN_ON"},
    )

    _clear_overrides(client)

    assert first_response.status_code == 200
    assert second_response.status_code == 429
    assert second_response.json()["detail"] == "Too many device control requests"
    assert calls == 1


def test_list_devices_rejects_invalid_home_id_before_service_call(client, monkeypatch) -> None:
    owner_id = UUID("550e8400-e29b-41d4-a716-446655440000")
    fake_db = object()
    _override_dependencies(client, owner_id, fake_db)

    called = False

    def fake_list_devices(*args, **kwargs):
        nonlocal called
        called = True

    monkeypatch.setattr("app.routes.devices.device_service.list_devices", fake_list_devices)

    response = client.get("/api/v1/devices?home_id=not-a-uuid")

    _clear_overrides(client)

    assert response.status_code == 422
    assert called is False
