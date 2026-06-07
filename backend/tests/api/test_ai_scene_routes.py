from datetime import UTC, datetime
from types import SimpleNamespace
from uuid import UUID, uuid4

from app.core.deps import get_current_owner_id
from app.db.session import get_db
from app.models.enums import DeviceAction
from app.schemas.ai import (
    AIScenarioDraft,
    AIScenarioDraftAction,
    AutomationSuggestionList,
    HomeStateRead,
    HomeStateSummary,
)
from app.schemas.device import DeviceRead


def _override_dependencies(client, owner_id: UUID, db: object) -> None:
    client.app.dependency_overrides[get_current_owner_id] = lambda: owner_id
    client.app.dependency_overrides[get_db] = lambda: db


def _clear_overrides(client) -> None:
    client.app.dependency_overrides.clear()


def test_state_route_returns_current_home_state(client, monkeypatch) -> None:
    owner_id = UUID("550e8400-e29b-41d4-a716-446655440000")
    fake_db = object()
    device_id = uuid4()
    room_id = uuid4()
    generated_at = datetime(2026, 5, 8, 23, 0, tzinfo=UTC)
    created_at = datetime(2026, 5, 8, 12, 0, tzinfo=UTC)

    _override_dependencies(client, owner_id, fake_db)
    monkeypatch.setattr(
        "app.routes.ai.ai_service.get_home_state",
        lambda db, *, owner_id: HomeStateRead(
            generated_at=generated_at,
            summary=HomeStateSummary(total_devices=1, active_devices=1, open_doors=0),
            devices=[
                DeviceRead(
                    id=device_id,
                    name="Main Light",
                    type="LIGHT",
                    status="ON",
                    room_id=room_id,
                    owner_id=owner_id,
                    created_at=created_at,
                    updated_at=created_at,
                )
            ],
        ),
    )

    response = client.get("/api/v1/state")

    _clear_overrides(client)

    assert response.status_code == 200
    assert response.json()["summary"] == {"total_devices": 1, "active_devices": 1, "open_doors": 0}
    assert response.json()["devices"][0]["name"] == "Main Light"


def test_ai_suggestions_route_returns_rule_based_suggestions(client, monkeypatch) -> None:
    owner_id = UUID("550e8400-e29b-41d4-a716-446655440000")
    fake_db = object()
    generated_at = datetime(2026, 5, 8, 23, 0, tzinfo=UTC)

    _override_dependencies(client, owner_id, fake_db)
    monkeypatch.setattr(
        "app.routes.ai.ai_service.get_automation_suggestions",
        lambda db, *, owner_id: AutomationSuggestionList(generated_at=generated_at, suggestions=[]),
    )

    response = client.get("/api/v1/ai/suggestions")

    _clear_overrides(client)

    assert response.status_code == 200
    assert response.json()["suggestions"] == []


def test_scenario_draft_route_returns_ai_draft(client, monkeypatch) -> None:
    owner_id = UUID("550e8400-e29b-41d4-a716-446655440000")
    fake_db = object()
    device_id = uuid4()

    _override_dependencies(client, owner_id, fake_db)
    monkeypatch.setattr(
        "app.routes.ai.ai_service.generate_scenario_draft",
        lambda db, *, owner_id, prompt: AIScenarioDraft(
            name="Night Mode",
            description="Turn off the lights.",
            actions=[
                AIScenarioDraftAction(
                    device_id=device_id,
                    action=DeviceAction.TURN_OFF,
                )
            ],
            explanation="Matched the requested routine to one controllable light.",
        ),
    )

    response = client.post("/api/v1/ai/scenario-draft", json={"prompt": "make night mode"})

    _clear_overrides(client)

    assert response.status_code == 200
    assert response.json()["name"] == "Night Mode"
    assert response.json()["actions"] == [
        {
            "device_id": str(device_id),
            "action": "TURN_OFF",
        }
    ]


def test_scene_run_accepts_tz_payload(client, monkeypatch) -> None:
    owner_id = UUID("550e8400-e29b-41d4-a716-446655440000")
    fake_db = object()
    device_id = uuid4()
    room_id = uuid4()
    created_at = datetime(2026, 5, 8, 12, 0, tzinfo=UTC)

    _override_dependencies(client, owner_id, fake_db)

    def fake_run_scene(db, *, owner_id, payload):
        assert db is fake_db
        assert owner_id == owner_id_value
        assert payload.name == "night_mode"
        assert payload.actions[0].device == "light"
        assert payload.actions[0].value is False
        return SimpleNamespace(
            name=payload.name,
            executed_actions=1,
            devices=[
                SimpleNamespace(
                    id=device_id,
                    name="Main Light",
                    type="LIGHT",
                    status="OFF",
                    room_id=room_id,
                    owner_id=owner_id,
                    created_at=created_at,
                    updated_at=created_at,
                )
            ],
        )

    owner_id_value = owner_id
    monkeypatch.setattr("app.routes.scenes.scene_service.run_scene", fake_run_scene)

    response = client.post(
        "/api/v1/scenes/run",
        json={"name": "night_mode", "actions": [{"device": "light", "value": False}]},
    )

    _clear_overrides(client)

    assert response.status_code == 200
    assert response.json()["name"] == "night_mode"
    assert response.json()["executed_actions"] == 1
    assert response.json()["devices"][0]["status"] == "OFF"
