from datetime import UTC, datetime
from types import SimpleNamespace
from uuid import UUID, uuid4

import pytest

from app.core.deps import get_current_owner_id
from app.db.session import get_db


def _override_dependencies(client, owner_id: UUID, db: object) -> None:
    client.app.dependency_overrides[get_current_owner_id] = lambda: owner_id
    client.app.dependency_overrides[get_db] = lambda: db


def _clear_overrides(client) -> None:
    client.app.dependency_overrides.clear()


def _iso_utc(value: datetime) -> str:
    return value.isoformat().replace("+00:00", "Z")


def test_list_events_supports_filters(client, monkeypatch) -> None:
    owner_id = UUID("550e8400-e29b-41d4-a716-446655440000")
    fake_db = object()
    device_id = uuid4()
    home_id = uuid4()
    event_id = uuid4()
    timestamp = datetime(2026, 4, 15, 12, 0, tzinfo=UTC)
    date_from = "2026-04-15T10:00:00Z"
    date_to = "2026-04-15T14:00:00Z"

    _override_dependencies(client, owner_id, fake_db)

    def fake_list_events(db, *, owner_id, device_id=None, home_id=None, date_from=None, date_to=None):
        assert db is fake_db
        assert owner_id == owner_id_value
        assert device_id == device_id_value
        assert home_id == home_id_value
        assert _iso_utc(date_from) == date_from_value
        assert _iso_utc(date_to) == date_to_value
        return [
            SimpleNamespace(
                id=event_id,
                device_id=device_id,
                action="TURN_ON",
                timestamp=timestamp,
                owner_id=owner_id,
            )
        ]

    owner_id_value = owner_id
    device_id_value = device_id
    home_id_value = home_id
    date_from_value = date_from
    date_to_value = date_to
    monkeypatch.setattr("app.routes.events.event_service.list_events", fake_list_events)

    response = client.get(
        f"/api/v1/events?device_id={device_id}&home_id={home_id}&date_from={date_from}&date_to={date_to}"
    )

    _clear_overrides(client)

    assert response.status_code == 200
    assert response.json() == [
        {
            "id": str(event_id),
            "device_id": str(device_id),
            "action": "TURN_ON",
            "timestamp": _iso_utc(timestamp),
            "owner_id": str(owner_id),
        }
    ]


def test_list_device_events_uses_path_device_scope(client, monkeypatch) -> None:
    owner_id = UUID("550e8400-e29b-41d4-a716-446655440000")
    fake_db = object()
    device_id = uuid4()
    event_id = uuid4()
    timestamp = datetime(2026, 4, 15, 12, 0, tzinfo=UTC)

    _override_dependencies(client, owner_id, fake_db)

    def fake_list_events(db, *, owner_id, device_id=None, home_id=None, date_from=None, date_to=None):
        assert db is fake_db
        assert owner_id == owner_id_value
        assert device_id == device_id_value
        assert home_id is None
        assert date_from is None
        assert date_to is None
        return [
            SimpleNamespace(
                id=event_id,
                device_id=device_id,
                action="OPEN",
                timestamp=timestamp,
                owner_id=owner_id,
            )
        ]

    owner_id_value = owner_id
    device_id_value = device_id
    monkeypatch.setattr("app.routes.events.event_service.list_events", fake_list_events)

    response = client.get(f"/api/v1/events/device/{device_id}")

    _clear_overrides(client)

    assert response.status_code == 200
    assert response.json()[0]["device_id"] == str(device_id)
    assert response.json()[0]["action"] == "OPEN"


@pytest.mark.parametrize(
    ("method", "path"),
    [
        ("get", "/api/v1/events"),
        ("get", f"/api/v1/events/device/{uuid4()}"),
    ],
)
def test_event_routes_require_authentication(client, method: str, path: str) -> None:
    request = getattr(client, method)
    response = request(path)

    assert response.status_code == 401
    assert response.json()["detail"] == "Could not validate credentials"


def test_list_events_rejects_invalid_device_id_before_service_call(client, monkeypatch) -> None:
    owner_id = UUID("550e8400-e29b-41d4-a716-446655440000")
    fake_db = object()
    _override_dependencies(client, owner_id, fake_db)

    called = False

    def fake_list_events(*args, **kwargs):
        nonlocal called
        called = True

    monkeypatch.setattr("app.routes.events.event_service.list_events", fake_list_events)

    response = client.get("/api/v1/events?device_id=not-a-uuid")

    _clear_overrides(client)

    assert response.status_code == 422
    assert called is False


def test_list_events_rejects_invalid_datetime_before_service_call(client, monkeypatch) -> None:
    owner_id = UUID("550e8400-e29b-41d4-a716-446655440000")
    fake_db = object()
    _override_dependencies(client, owner_id, fake_db)

    called = False

    def fake_list_events(*args, **kwargs):
        nonlocal called
        called = True

    monkeypatch.setattr("app.routes.events.event_service.list_events", fake_list_events)

    response = client.get("/api/v1/events?date_from=not-a-date")

    _clear_overrides(client)

    assert response.status_code == 422
    assert called is False
