from datetime import UTC, datetime
from types import SimpleNamespace
from uuid import UUID, uuid4

from app.core.deps import get_auth_context, get_current_owner_id
from app.db.session import get_db
from app.models.enums import DeviceAction
from app.schemas.ai import (
    AIAssistantActionExecutionResult,
    AIAssistantChatResponse,
    AIAssistantControlProposal,
    AIAssistantDeviceAction,
    AIAssistantExecutedAction,
    AISecurityAnalysisResponse,
    AISecurityFinding,
    AIScenarioDraft,
    AIScenarioDraftAction,
    AutomationSuggestionList,
    HomeStateRead,
    HomeStateSummary,
)
from app.schemas.auth_context import AuthContext
from app.schemas.device import DeviceRead


def _override_dependencies(client, owner_id: UUID, db: object, roles: list[str] | None = None) -> None:
    client.app.dependency_overrides[get_current_owner_id] = lambda: owner_id
    client.app.dependency_overrides[get_auth_context] = lambda: AuthContext(
        owner_id=owner_id,
        roles=roles or ["USER"],
        auth_mode="jwt",
    )
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


def test_assistant_chat_route_returns_answer_and_draft(client, monkeypatch) -> None:
    owner_id = UUID("550e8400-e29b-41d4-a716-446655440000")
    fake_db = object()
    device_id = uuid4()

    _override_dependencies(client, owner_id, fake_db)
    monkeypatch.setattr(
        "app.routes.ai.ai_service.assistant_chat",
        lambda db, *, owner_id, message: AIAssistantChatResponse(
            answer="I prepared a draft scene for you to review.",
            scenario_draft=AIScenarioDraft(
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
            control_proposal=AIAssistantControlProposal(
                actions=[
                    AIAssistantDeviceAction(
                        device_id=device_id,
                        action=DeviceAction.TURN_OFF,
                    )
                ],
                explanation="Confirm to turn off the light.",
            ),
        ),
    )

    response = client.post("/api/v1/ai/chat", json={"message": "make night mode"})

    _clear_overrides(client)

    assert response.status_code == 200
    assert response.json()["answer"] == "I prepared a draft scene for you to review."
    assert response.json()["scenario_draft"]["name"] == "Night Mode"
    assert response.json()["control_proposal"]["actions"][0]["action"] == "TURN_OFF"


def test_confirm_assistant_device_actions_route_executes_actions(client, monkeypatch) -> None:
    owner_id = UUID("550e8400-e29b-41d4-a716-446655440000")
    fake_db = object()
    device_id = uuid4()
    room_id = uuid4()
    created_at = datetime(2026, 5, 8, 12, 0, tzinfo=UTC)
    device = DeviceRead(
        id=device_id,
        name="Main Light",
        type="LIGHT",
        status="OFF",
        room_id=room_id,
        owner_id=owner_id,
        created_at=created_at,
        updated_at=created_at,
    )

    _override_dependencies(client, owner_id, fake_db)
    monkeypatch.setattr(
        "app.routes.ai.ai_service.execute_assistant_device_actions",
        lambda db, *, owner_id, actions: AIAssistantActionExecutionResult(
            message="Executed 1 action.",
            executed_actions=[
                AIAssistantExecutedAction(
                    device=device,
                    action=DeviceAction.TURN_OFF,
                )
            ],
        ),
    )
    monkeypatch.setattr("app.routes.ai.publish_device_update_from_sync", lambda **kwargs: None)
    monkeypatch.setattr("app.routes.ai.publish_device_command", lambda **kwargs: None)

    response = client.post(
        "/api/v1/ai/confirm-device-actions",
        json={"actions": [{"device_id": str(device_id), "action": "TURN_OFF"}]},
    )

    _clear_overrides(client)

    assert response.status_code == 200
    assert response.json()["message"] == "Executed 1 action."
    assert response.json()["executed_actions"][0]["device"]["status"] == "OFF"


def test_security_analysis_route_includes_admin_security_events(client, monkeypatch) -> None:
    owner_id = UUID("550e8400-e29b-41d4-a716-446655440000")
    fake_db = object()
    captured: dict = {}
    generated_at = datetime(2026, 5, 8, 23, 0, tzinfo=UTC)

    _override_dependencies(client, owner_id, fake_db, roles=["ADMIN"])

    def fake_analyze_security_activity(db, *, owner_id, window, include_security_events):
        captured["db"] = db
        captured["owner_id"] = owner_id
        captured["window"] = window
        captured["include_security_events"] = include_security_events
        return AISecurityAnalysisResponse(
            generated_at=generated_at,
            window=window,
            risk_level="MEDIUM",
            summary="Recent activity has one security signal to review.",
            findings=[
                AISecurityFinding(
                    severity="MEDIUM",
                    title="Repeated door events",
                    detail="The door was opened more than usual in this window.",
                )
            ],
            recommendations=["Review the door activity and confirm it was expected."],
            reviewed_events=3,
            reviewed_security_events=1,
        )

    monkeypatch.setattr("app.routes.ai.ai_service.analyze_security_activity", fake_analyze_security_activity)

    response = client.post("/api/v1/ai/security-analysis", json={"window": "week"})

    _clear_overrides(client)

    assert response.status_code == 200
    assert response.json()["risk_level"] == "MEDIUM"
    assert response.json()["findings"][0]["title"] == "Repeated door events"
    assert captured == {
        "db": fake_db,
        "owner_id": owner_id,
        "window": "week",
        "include_security_events": True,
    }


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
