from datetime import UTC, datetime, timedelta
import json
from types import SimpleNamespace
from unittest.mock import MagicMock
from uuid import uuid4

from fastapi import HTTPException

from app.models.enums import DeviceAction, DeviceStatus, DeviceType
from app.schemas.scene import SceneActionRequest, SceneRunRequest
from app.services import ai_service, scene_service


def test_ai_suggestions_detect_repeated_evening_action(monkeypatch) -> None:
    db = MagicMock()
    owner_id = uuid4()
    device_id = uuid4()
    device = SimpleNamespace(name="Main Light")
    now = datetime(2026, 5, 8, 23, 30, tzinfo=UTC)
    events = [
        SimpleNamespace(
            device_id=device_id,
            action=DeviceAction.TURN_OFF,
            timestamp=now - timedelta(days=day),
            device=device,
        )
        for day in range(3)
    ]

    monkeypatch.setattr("app.services.ai_service.event_service.list_events", lambda *args, **kwargs: events)

    result = ai_service.get_automation_suggestions(db, owner_id=owner_id, now=now)

    assert len(result.suggestions) == 1
    assert result.suggestions[0].device_id == device_id
    assert result.suggestions[0].action == "TURN_OFF"
    assert result.suggestions[0].suggested_time == "23:00"
    assert result.suggestions[0].evidence_count == 3


def test_home_state_counts_active_devices(monkeypatch) -> None:
    db = MagicMock()
    owner_id = uuid4()
    now = datetime(2026, 5, 8, 12, 0, tzinfo=UTC)
    devices = [
        SimpleNamespace(
            id=uuid4(),
            name="Main Light",
            type=DeviceType.LIGHT,
            status=DeviceStatus.ON,
            room_id=uuid4(),
            owner_id=owner_id,
            created_at=now,
            updated_at=now,
        ),
        SimpleNamespace(
            id=uuid4(),
            name="Front Door",
            type=DeviceType.DOOR,
            status=DeviceStatus.OPEN,
            room_id=uuid4(),
            owner_id=owner_id,
            created_at=now,
            updated_at=now,
        ),
    ]

    monkeypatch.setattr("app.services.ai_service.device_service.list_devices", lambda *args, **kwargs: devices)

    result = ai_service.get_home_state(db, owner_id=owner_id)

    assert result.summary.total_devices == 2
    assert result.summary.active_devices == 2
    assert result.summary.open_doors == 1


def test_generate_scenario_draft_uses_openai_structured_json(monkeypatch) -> None:
    db = MagicMock()
    owner_id = uuid4()
    room_id = uuid4()
    device_id = uuid4()
    now = datetime(2026, 5, 8, 12, 0, tzinfo=UTC)
    device = SimpleNamespace(
        id=device_id,
        name="Bedroom Light",
        type=DeviceType.LIGHT,
        status=DeviceStatus.ON,
        room_id=room_id,
        owner_id=owner_id,
        created_at=now,
        updated_at=now,
    )
    room = SimpleNamespace(id=room_id, name="Bedroom")
    captured: dict = {}

    class FakeResponse:
        def raise_for_status(self) -> None:
            return None

        def json(self) -> dict:
            return {
                "output": [
                    {
                        "type": "message",
                        "content": [
                            {
                                "type": "output_text",
                                "text": json.dumps(
                                    {
                                        "name": "Night Mode",
                                        "description": "Turn off the bedroom light.",
                                        "actions": [
                                            {
                                                "device_id": str(device_id),
                                                "action": "TURN_OFF",
                                            }
                                        ],
                                        "explanation": "Matched the bedroom light to the requested night routine.",
                                    }
                                ),
                            }
                        ],
                    }
                ]
            }

    class FakeClient:
        def __init__(self, timeout: float) -> None:
            captured["timeout"] = timeout

        def __enter__(self) -> "FakeClient":
            return self

        def __exit__(self, *args: object) -> None:
            return None

        def post(self, url: str, *, headers: dict, json: dict) -> FakeResponse:
            captured["url"] = url
            captured["headers"] = headers
            captured["payload"] = json
            return FakeResponse()

    monkeypatch.setattr(ai_service.settings, "openai_api_key", "test-key")
    monkeypatch.setattr(ai_service.settings, "openai_model", "test-model")
    monkeypatch.setattr(ai_service.settings, "openai_timeout_seconds", 3.0)
    monkeypatch.setattr("app.services.ai_service.device_service.list_devices", lambda *args, **kwargs: [device])
    monkeypatch.setattr("app.services.ai_service.room_service.list_rooms", lambda *args, **kwargs: [room])
    monkeypatch.setattr(ai_service.httpx, "Client", FakeClient)

    result = ai_service.generate_scenario_draft(db, owner_id=owner_id, prompt="make night mode")

    assert result.name == "Night Mode"
    assert result.actions[0].device_id == device_id
    assert result.actions[0].action == DeviceAction.TURN_OFF
    assert captured["url"] == ai_service.OPENAI_RESPONSES_URL
    assert captured["payload"]["model"] == "test-model"
    assert captured["payload"]["text"]["format"]["type"] == "json_schema"
    request_context = json.loads(captured["payload"]["input"][1]["content"])
    assert request_context["available_devices"][0]["room"] == "Bedroom"
    assert "hardware_id" not in request_context["available_devices"][0]


def test_generate_scenario_draft_requires_openai_key(monkeypatch) -> None:
    db = MagicMock()
    owner_id = uuid4()
    room_id = uuid4()
    device = SimpleNamespace(
        id=uuid4(),
        name="Main Light",
        type=DeviceType.LIGHT,
        status=DeviceStatus.ON,
        room_id=room_id,
    )

    monkeypatch.setattr(ai_service.settings, "openai_api_key", "")
    monkeypatch.setattr("app.services.ai_service.device_service.list_devices", lambda *args, **kwargs: [device])
    monkeypatch.setattr("app.services.ai_service.room_service.list_rooms", lambda *args, **kwargs: [])

    try:
        ai_service.generate_scenario_draft(db, owner_id=owner_id, prompt="turn off light")
    except HTTPException as exc:
        assert exc.status_code == 503
    else:
        raise AssertionError("Expected OPENAI_API_KEY validation error")


def test_assistant_chat_returns_answer_and_scenario_draft(monkeypatch) -> None:
    db = MagicMock()
    owner_id = uuid4()
    device_id = uuid4()
    device = SimpleNamespace(
        id=device_id,
        name="Bedroom Light",
        type=DeviceType.LIGHT,
        status=DeviceStatus.ON,
    )

    monkeypatch.setattr(
        ai_service,
        "_assistant_context",
        lambda db, *, owner_id: (
            [device],
            {
                "devices": [
                    {
                        "device_id": str(device_id),
                        "name": "Bedroom Light",
                        "type": "LIGHT",
                        "status": "ON",
                        "supported_actions": ["TURN_ON", "TURN_OFF"],
                    }
                ],
                "recent_events": [],
                "scenarios": [],
            },
        ),
    )
    monkeypatch.setattr("app.services.ai_service.scenario_service.list_scenarios", lambda *args, **kwargs: [])
    monkeypatch.setattr(
        ai_service,
        "_post_openai_structured",
        lambda **kwargs: {
            "answer": "I prepared a draft scene for you to review.",
            "scenario_draft": {
                "present": True,
                "name": "Night Mode",
                "description": "Turn off bedroom light.",
                "actions": [
                    {
                        "device_id": str(device_id),
                        "action": "TURN_OFF",
                    }
                ],
                "explanation": "The request matched the bedroom light.",
            },
            "control_proposal": {
                "present": False,
                "actions": [],
                "explanation": "",
            },
            "scenario_run": {
                "present": False,
                "scenario_id": "00000000-0000-0000-0000-000000000000",
                "explanation": "",
            },
        },
    )

    result = ai_service.assistant_chat(db, owner_id=owner_id, message="make night mode")

    assert result.answer == "I prepared a draft scene for you to review."
    assert result.scenario_draft is not None
    assert result.scenario_draft.name == "Night Mode"
    assert result.scenario_draft.actions[0].action == DeviceAction.TURN_OFF


def test_assistant_chat_returns_control_proposal(monkeypatch) -> None:
    db = MagicMock()
    owner_id = uuid4()
    device_id = uuid4()
    device = SimpleNamespace(
        id=device_id,
        name="Bedroom Light",
        type=DeviceType.LIGHT,
        status=DeviceStatus.ON,
    )

    monkeypatch.setattr(
        ai_service,
        "_assistant_context",
        lambda db, *, owner_id: (
            [device],
            {"devices": [], "recent_events": [], "scenarios": []},
        ),
    )
    monkeypatch.setattr("app.services.ai_service.scenario_service.list_scenarios", lambda *args, **kwargs: [])
    monkeypatch.setattr(
        ai_service,
        "_post_openai_structured",
        lambda **kwargs: {
            "answer": "I can turn off Bedroom Light after you confirm.",
            "scenario_draft": {
                "present": False,
                "name": "",
                "description": "",
                "actions": [],
                "explanation": "",
            },
            "control_proposal": {
                "present": True,
                "actions": [
                    {
                        "device_id": str(device_id),
                        "action": "TURN_OFF",
                    }
                ],
                "explanation": "Bedroom Light is controllable.",
            },
            "scenario_run": {
                "present": False,
                "scenario_id": "00000000-0000-0000-0000-000000000000",
                "explanation": "",
            },
        },
    )

    result = ai_service.assistant_chat(db, owner_id=owner_id, message="turn off bedroom light")

    assert result.control_proposal is not None
    assert result.control_proposal.actions[0].device_id == device_id
    assert result.control_proposal.actions[0].action == DeviceAction.TURN_OFF


def test_run_scene_resolves_boolean_light_action(monkeypatch) -> None:
    db = MagicMock()
    owner_id = uuid4()
    device = SimpleNamespace(
        id=uuid4(),
        name="Main Light",
        type=DeviceType.LIGHT,
        status=DeviceStatus.ON,
        room_id=uuid4(),
        owner_id=owner_id,
        created_at=datetime(2026, 5, 8, 12, 0, tzinfo=UTC),
        updated_at=datetime(2026, 5, 8, 12, 0, tzinfo=UTC),
    )

    monkeypatch.setattr("app.services.scene_service.device_service.list_devices", lambda *args, **kwargs: [device])
    monkeypatch.setattr(
        "app.services.scene_service.device_service._apply_device_action_to_device",
        lambda db, *, device, owner_id, action: SimpleNamespace(**{**device.__dict__, "status": DeviceStatus.OFF}),
    )

    result = scene_service.run_scene(
        db,
        owner_id=owner_id,
        payload=SceneRunRequest(
            name="night_mode",
            actions=[SceneActionRequest(device="light", value=False)],
        ),
    )

    assert result.executed_actions == 1
    assert result.devices[0].status == DeviceStatus.OFF
    db.commit.assert_called_once()
