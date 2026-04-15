from datetime import UTC, datetime
from types import SimpleNamespace
from uuid import UUID, uuid4

import pytest

from app.core.config import settings
from app.core.deps import get_current_owner_id
from app.db.session import get_db


def _override_dependencies(client, owner_id: UUID, db: object) -> None:
    client.app.dependency_overrides[get_current_owner_id] = lambda: owner_id
    client.app.dependency_overrides[get_db] = lambda: db


def _clear_overrides(client) -> None:
    client.app.dependency_overrides.clear()


def _iso_utc(value: datetime) -> str:
    return value.isoformat().replace("+00:00", "Z")


def test_create_home_uses_authenticated_owner(client, monkeypatch) -> None:
    owner_id = UUID("550e8400-e29b-41d4-a716-446655440000")
    fake_db = object()
    created_at = datetime(2026, 4, 15, 12, 0, tzinfo=UTC)

    _override_dependencies(client, owner_id, fake_db)

    def fake_create_home(db, *, owner_id, payload):
        assert db is fake_db
        assert payload.name == "My Home"
        return SimpleNamespace(
            id=uuid4(),
            name=payload.name,
            owner_id=owner_id,
            created_at=created_at,
        )

    monkeypatch.setattr("app.routes.homes.home_service.create_home", fake_create_home)

    response = client.post("/api/v1/homes", json={"name": "My Home"})

    _clear_overrides(client)

    assert response.status_code == 201
    assert response.json()["name"] == "My Home"
    assert response.json()["owner_id"] == str(owner_id)


def test_list_homes_returns_only_service_results(client, monkeypatch) -> None:
    owner_id = UUID("550e8400-e29b-41d4-a716-446655440000")
    fake_db = object()
    created_at = datetime(2026, 4, 15, 12, 0, tzinfo=UTC)
    home = SimpleNamespace(id=uuid4(), name="Apartment", owner_id=owner_id, created_at=created_at)

    _override_dependencies(client, owner_id, fake_db)
    monkeypatch.setattr("app.routes.homes.home_service.list_homes", lambda db, *, owner_id: [home])

    response = client.get("/api/v1/homes")

    _clear_overrides(client)

    assert response.status_code == 200
    assert response.json() == [
        {
            "id": str(home.id),
            "name": "Apartment",
            "owner_id": str(owner_id),
            "created_at": _iso_utc(created_at),
        }
    ]


def test_get_home_passes_owner_scope_to_service(client, monkeypatch) -> None:
    owner_id = UUID("550e8400-e29b-41d4-a716-446655440000")
    fake_db = object()
    home_id = uuid4()
    created_at = datetime(2026, 4, 15, 12, 0, tzinfo=UTC)

    _override_dependencies(client, owner_id, fake_db)

    def fake_get_home(db, *, home_id, owner_id):
        assert db is fake_db
        assert home_id == home_id_value
        assert owner_id == owner_id_value
        return SimpleNamespace(
            id=home_id_value,
            name="House",
            owner_id=owner_id_value,
            created_at=created_at,
        )

    home_id_value = home_id
    owner_id_value = owner_id
    monkeypatch.setattr("app.routes.homes.home_service.get_home_or_404", fake_get_home)

    response = client.get(f"/api/v1/homes/{home_id}")

    _clear_overrides(client)

    assert response.status_code == 200
    assert response.json()["id"] == str(home_id)


def test_create_room_uses_home_scope_from_owner(client, monkeypatch) -> None:
    owner_id = UUID("550e8400-e29b-41d4-a716-446655440000")
    fake_db = object()
    home_id = uuid4()
    room_id = uuid4()
    created_at = datetime(2026, 4, 15, 12, 0, tzinfo=UTC)

    _override_dependencies(client, owner_id, fake_db)

    def fake_create_room(db, *, owner_id, payload):
        assert db is fake_db
        assert payload.home_id == home_id
        assert payload.name == "Kitchen"
        return SimpleNamespace(
            id=room_id,
            name=payload.name,
            home_id=payload.home_id,
            created_at=created_at,
        )

    monkeypatch.setattr("app.routes.rooms.room_service.create_room", fake_create_room)

    response = client.post("/api/v1/rooms", json={"name": "Kitchen", "home_id": str(home_id)})

    _clear_overrides(client)

    assert response.status_code == 201
    assert response.json()["id"] == str(room_id)
    assert response.json()["home_id"] == str(home_id)


def test_list_rooms_supports_home_filter(client, monkeypatch) -> None:
    owner_id = UUID("550e8400-e29b-41d4-a716-446655440000")
    fake_db = object()
    home_id = uuid4()
    room_id = uuid4()
    created_at = datetime(2026, 4, 15, 12, 0, tzinfo=UTC)
    room = SimpleNamespace(id=room_id, name="Bedroom", home_id=home_id, created_at=created_at)

    _override_dependencies(client, owner_id, fake_db)

    def fake_list_rooms(db, *, owner_id, home_id=None):
        assert db is fake_db
        assert home_id == home_id_value
        return [room]

    home_id_value = home_id
    monkeypatch.setattr("app.routes.rooms.room_service.list_rooms", fake_list_rooms)

    response = client.get(f"/api/v1/rooms?home_id={home_id}")

    _clear_overrides(client)

    assert response.status_code == 200
    assert response.json() == [
        {
            "id": str(room_id),
            "name": "Bedroom",
            "home_id": str(home_id),
            "created_at": _iso_utc(created_at),
        }
    ]


def test_get_room_returns_serialized_room(client, monkeypatch) -> None:
    owner_id = UUID("550e8400-e29b-41d4-a716-446655440000")
    fake_db = object()
    room_id = uuid4()
    home_id = uuid4()
    created_at = datetime(2026, 4, 15, 12, 0, tzinfo=UTC)

    _override_dependencies(client, owner_id, fake_db)
    monkeypatch.setattr(
        "app.routes.rooms.room_service.get_room_or_404",
        lambda db, *, room_id, owner_id: SimpleNamespace(
            id=room_id,
            name="Living Room",
            home_id=home_id,
            created_at=created_at,
        ),
    )

    response = client.get(f"/api/v1/rooms/{room_id}")

    _clear_overrides(client)

    assert response.status_code == 200
    assert response.json()["id"] == str(room_id)
    assert response.json()["home_id"] == str(home_id)


@pytest.mark.parametrize(
    ("method", "path", "payload"),
    [
        ("post", "/api/v1/homes", {"name": "My Home"}),
        ("get", "/api/v1/homes", None),
        ("get", f"/api/v1/homes/{uuid4()}", None),
        ("post", "/api/v1/rooms", {"name": "Kitchen", "home_id": str(uuid4())}),
        ("get", "/api/v1/rooms", None),
        ("get", f"/api/v1/rooms/{uuid4()}", None),
    ],
)
def test_home_and_room_routes_require_authentication(client, method: str, path: str, payload: dict | None) -> None:
    request = getattr(client, method)
    response = request(path, json=payload) if payload is not None else request(path)

    assert response.status_code == 401
    assert response.json()["detail"] == "Could not validate credentials"


def test_create_room_rejects_invalid_home_id_before_service_call(client, monkeypatch) -> None:
    owner_id = UUID("550e8400-e29b-41d4-a716-446655440000")
    fake_db = object()
    _override_dependencies(client, owner_id, fake_db)

    called = False

    def fake_create_room(*args, **kwargs):
        nonlocal called
        called = True

    monkeypatch.setattr("app.routes.rooms.room_service.create_room", fake_create_room)

    response = client.post("/api/v1/rooms", json={"name": "Kitchen", "home_id": "not-a-uuid"})

    _clear_overrides(client)

    assert response.status_code == 422
    assert called is False


def test_create_home_rejects_oversized_request_body(client, monkeypatch) -> None:
    owner_id = UUID("550e8400-e29b-41d4-a716-446655440000")
    fake_db = object()
    _override_dependencies(client, owner_id, fake_db)
    monkeypatch.setattr(settings, "security_max_request_body_bytes", 64)

    response = client.post(
        "/api/v1/homes",
        json={"name": "A" * 500},
    )

    _clear_overrides(client)

    assert response.status_code == 413
    assert response.json()["detail"] == "Request body is too large. Maximum allowed size is 64 bytes"
