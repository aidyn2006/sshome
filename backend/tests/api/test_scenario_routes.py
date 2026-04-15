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


def test_create_scenario_passes_owner_scope_and_actions(client, monkeypatch) -> None:
    owner_id = UUID("550e8400-e29b-41d4-a716-446655440000")
    fake_db = object()
    light_id = uuid4()
    door_id = uuid4()
    scenario_id = uuid4()
    created_at = datetime(2026, 4, 15, 12, 0, tzinfo=UTC)

    _override_dependencies(client, owner_id, fake_db)

    def fake_create_scenario(db, *, owner_id, payload):
        assert db is fake_db
        assert owner_id == owner_id_value
        assert payload.name == "Leave Home"
        assert payload.description == "Turn devices off"
        assert len(payload.actions) == 2
        assert payload.actions[0].device_id == light_id
        assert payload.actions[0].action.value == "TURN_OFF"
        assert payload.actions[1].device_id == door_id
        assert payload.actions[1].action.value == "CLOSE"
        return SimpleNamespace(
            id=scenario_id,
            name=payload.name,
            description=payload.description,
            actions=[
                {"device_id": str(light_id), "action": "TURN_OFF"},
                {"device_id": str(door_id), "action": "CLOSE"},
            ],
            owner_id=owner_id,
            created_at=created_at,
        )

    owner_id_value = owner_id
    monkeypatch.setattr("app.routes.scenarios.scenario_service.create_scenario", fake_create_scenario)

    response = client.post(
        "/api/v1/scenarios",
        json={
            "name": "Leave Home",
            "description": "Turn devices off",
            "actions": [
                {"device_id": str(light_id), "action": "TURN_OFF"},
                {"device_id": str(door_id), "action": "CLOSE"},
            ],
        },
    )

    _clear_overrides(client)

    assert response.status_code == 201
    assert response.json() == {
        "id": str(scenario_id),
        "name": "Leave Home",
        "description": "Turn devices off",
        "actions": [
            {"device_id": str(light_id), "action": "TURN_OFF"},
            {"device_id": str(door_id), "action": "CLOSE"},
        ],
        "owner_id": str(owner_id),
        "created_at": _iso_utc(created_at),
    }


def test_list_scenarios_returns_serialized_rows(client, monkeypatch) -> None:
    owner_id = UUID("550e8400-e29b-41d4-a716-446655440000")
    fake_db = object()
    device_id = uuid4()
    created_at = datetime(2026, 4, 15, 12, 0, tzinfo=UTC)
    scenario = SimpleNamespace(
        id=uuid4(),
        name="Night Mode",
        description=None,
        actions=[{"device_id": str(device_id), "action": "TURN_OFF"}],
        owner_id=owner_id,
        created_at=created_at,
    )

    _override_dependencies(client, owner_id, fake_db)
    monkeypatch.setattr("app.routes.scenarios.scenario_service.list_scenarios", lambda db, *, owner_id: [scenario])

    response = client.get("/api/v1/scenarios")

    _clear_overrides(client)

    assert response.status_code == 200
    assert response.json() == [
        {
            "id": str(scenario.id),
            "name": "Night Mode",
            "description": None,
            "actions": [{"device_id": str(device_id), "action": "TURN_OFF"}],
            "owner_id": str(owner_id),
            "created_at": _iso_utc(created_at),
        }
    ]


def test_run_scenario_returns_execution_result(client, monkeypatch) -> None:
    owner_id = UUID("550e8400-e29b-41d4-a716-446655440000")
    fake_db = object()
    scenario_id = uuid4()
    light_id = uuid4()
    door_id = uuid4()
    created_at = datetime(2026, 4, 15, 12, 0, tzinfo=UTC)
    updated_at = datetime(2026, 4, 15, 12, 5, tzinfo=UTC)

    _override_dependencies(client, owner_id, fake_db)

    def fake_run_scenario(db, *, scenario_id, owner_id):
        assert db is fake_db
        assert scenario_id == scenario_id_value
        assert owner_id == owner_id_value
        return {
            "scenario_id": scenario_id,
            "executed_actions": 2,
            "devices": [
                SimpleNamespace(
                    id=light_id,
                    name="Main Light",
                    type="LIGHT",
                    status="OFF",
                    room_id=uuid4(),
                    owner_id=owner_id,
                    created_at=created_at,
                    updated_at=updated_at,
                ),
                SimpleNamespace(
                    id=door_id,
                    name="Front Door",
                    type="DOOR",
                    status="CLOSED",
                    room_id=uuid4(),
                    owner_id=owner_id,
                    created_at=created_at,
                    updated_at=updated_at,
                ),
            ],
        }

    scenario_id_value = scenario_id
    owner_id_value = owner_id
    monkeypatch.setattr("app.routes.scenarios.scenario_service.run_scenario", fake_run_scenario)

    response = client.post(f"/api/v1/scenarios/{scenario_id}/run")

    _clear_overrides(client)

    assert response.status_code == 200
    assert response.json()["scenario_id"] == str(scenario_id)
    assert response.json()["executed_actions"] == 2
    assert len(response.json()["devices"]) == 2
    assert response.json()["devices"][0]["id"] == str(light_id)
    assert response.json()["devices"][1]["id"] == str(door_id)


@pytest.mark.parametrize(
    ("method", "path", "payload"),
    [
        ("post", "/api/v1/scenarios", {"name": "Leave Home", "actions": [{"device_id": str(uuid4()), "action": "TURN_OFF"}]}),
        ("get", "/api/v1/scenarios", None),
        ("post", f"/api/v1/scenarios/{uuid4()}/run", None),
    ],
)
def test_scenario_routes_require_authentication(client, method: str, path: str, payload: dict | None) -> None:
    request = getattr(client, method)
    response = request(path, json=payload) if payload is not None else request(path)

    assert response.status_code == 401
    assert response.json()["detail"] == "Could not validate credentials"


def test_create_scenario_rejects_invalid_nested_action_before_service_call(client, monkeypatch) -> None:
    owner_id = UUID("550e8400-e29b-41d4-a716-446655440000")
    fake_db = object()
    device_id = uuid4()
    _override_dependencies(client, owner_id, fake_db)

    called = False

    def fake_create_scenario(*args, **kwargs):
        nonlocal called
        called = True

    monkeypatch.setattr("app.routes.scenarios.scenario_service.create_scenario", fake_create_scenario)

    response = client.post(
        "/api/v1/scenarios",
        json={
            "name": "Invalid",
            "actions": [{"device_id": str(device_id), "action": "LOCK"}],
        },
    )

    _clear_overrides(client)

    assert response.status_code == 422
    assert called is False


def test_create_scenario_rejects_too_many_actions_before_service_call(client, monkeypatch) -> None:
    owner_id = UUID("550e8400-e29b-41d4-a716-446655440000")
    fake_db = object()
    _override_dependencies(client, owner_id, fake_db)
    monkeypatch.setattr(settings, "scenario_max_actions", 1)

    called = False

    def fake_create_scenario(*args, **kwargs):
        nonlocal called
        called = True

    monkeypatch.setattr("app.routes.scenarios.scenario_service.create_scenario", fake_create_scenario)

    response = client.post(
        "/api/v1/scenarios",
        json={
            "name": "Too Many",
            "actions": [
                {"device_id": str(uuid4()), "action": "TURN_OFF"},
                {"device_id": str(uuid4()), "action": "CLOSE"},
            ],
        },
    )

    _clear_overrides(client)

    assert response.status_code == 422
    assert called is False


def test_run_scenario_rejects_invalid_scenario_id_before_service_call(client, monkeypatch) -> None:
    owner_id = UUID("550e8400-e29b-41d4-a716-446655440000")
    fake_db = object()
    _override_dependencies(client, owner_id, fake_db)

    called = False

    def fake_run_scenario(*args, **kwargs):
        nonlocal called
        called = True

    monkeypatch.setattr("app.routes.scenarios.scenario_service.run_scenario", fake_run_scenario)

    response = client.post("/api/v1/scenarios/not-a-uuid/run")

    _clear_overrides(client)

    assert response.status_code == 422
    assert called is False


def test_run_scenario_enforces_rate_limit(client, monkeypatch) -> None:
    owner_id = UUID("550e8400-e29b-41d4-a716-446655440000")
    fake_db = object()
    scenario_id = uuid4()
    device_id = uuid4()
    created_at = datetime(2026, 4, 15, 12, 0, tzinfo=UTC)
    updated_at = datetime(2026, 4, 15, 12, 5, tzinfo=UTC)
    _override_dependencies(client, owner_id, fake_db)
    monkeypatch.setattr(settings, "security_scenario_run_rate_limit", 1)

    calls = 0

    def fake_run_scenario(db, *, scenario_id, owner_id):
        nonlocal calls
        calls += 1
        return {
            "scenario_id": scenario_id,
            "executed_actions": 1,
            "devices": [
                {
                    "id": device_id,
                    "name": "Main Light",
                    "type": "LIGHT",
                    "status": "OFF",
                    "room_id": uuid4(),
                    "owner_id": owner_id,
                    "created_at": created_at,
                    "updated_at": updated_at,
                }
            ],
        }

    monkeypatch.setattr("app.routes.scenarios.scenario_service.run_scenario", fake_run_scenario)
    monkeypatch.setattr("app.routes.scenarios.publish_device_update_from_sync", lambda **kwargs: None)

    first_response = client.post(f"/api/v1/scenarios/{scenario_id}/run")
    second_response = client.post(f"/api/v1/scenarios/{scenario_id}/run")

    _clear_overrides(client)

    assert first_response.status_code == 200
    assert second_response.status_code == 429
    assert second_response.json()["detail"] == "Too many scenario execution requests"
    assert calls == 1
