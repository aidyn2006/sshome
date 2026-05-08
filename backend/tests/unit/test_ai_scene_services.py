from datetime import UTC, datetime, timedelta
from types import SimpleNamespace
from unittest.mock import MagicMock
from uuid import uuid4

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
