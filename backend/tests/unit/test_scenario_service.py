from datetime import UTC, datetime
from types import SimpleNamespace
from unittest.mock import MagicMock
from uuid import uuid4

import pytest
from fastapi import HTTPException

from app.models.enums import DeviceAction, DeviceStatus, DeviceType
from app.schemas.scenario import ScenarioActionItem, ScenarioCreate
from app.services import scenario_service


def test_get_scenario_or_404_returns_404_for_missing_scenario() -> None:
    db = MagicMock()
    db.scalar.return_value = None

    with pytest.raises(HTTPException) as exc_info:
        scenario_service.get_scenario_or_404(
            db,
            scenario_id=uuid4(),
            owner_id=uuid4(),
        )

    assert exc_info.value.status_code == 404
    assert exc_info.value.detail == "Scenario not found"


def test_create_scenario_persists_serialized_actions(monkeypatch) -> None:
    db = MagicMock()
    owner_id = uuid4()
    light_id = uuid4()
    door_id = uuid4()

    validated_actions: list[list[ScenarioActionItem]] = []

    def fake_validate_scenario_actions(db_arg, *, owner_id, actions):
        assert db_arg is db
        assert owner_id == owner_id_value
        validated_actions.append(actions)

    owner_id_value = owner_id
    monkeypatch.setattr("app.services.scenario_service._validate_scenario_actions", fake_validate_scenario_actions)

    scenario = scenario_service.create_scenario(
        db,
        owner_id=owner_id,
        payload=ScenarioCreate(
            name="Leave Home",
            description="Turn everything off",
            actions=[
                ScenarioActionItem(device_id=light_id, action=DeviceAction.TURN_OFF),
                ScenarioActionItem(device_id=door_id, action=DeviceAction.CLOSE),
            ],
        ),
    )

    db.add.assert_called_once_with(scenario)
    db.commit.assert_called_once()
    db.refresh.assert_called_once_with(scenario)
    assert validated_actions and len(validated_actions[0]) == 2
    assert scenario.owner_id == owner_id
    assert scenario.actions == [
        {"device_id": str(light_id), "action": "TURN_OFF"},
        {"device_id": str(door_id), "action": "CLOSE"},
    ]


def test_validate_scenario_actions_rejects_unsupported_device_command(monkeypatch) -> None:
    db = MagicMock()
    owner_id = uuid4()
    device_id = uuid4()

    monkeypatch.setattr(
        "app.services.scenario_service.device_service.get_device_or_404",
        lambda *args, **kwargs: SimpleNamespace(id=device_id, type=DeviceType.DOOR),
    )

    with pytest.raises(HTTPException) as exc_info:
        scenario_service._validate_scenario_actions(
            db,
            owner_id=owner_id,
            actions=[ScenarioActionItem(device_id=device_id, action=DeviceAction.TURN_ON)],
        )

    assert exc_info.value.status_code == 422
    assert exc_info.value.detail == "Action TURN_ON is not supported for device type DOOR"


def test_list_scenarios_returns_owned_rows() -> None:
    db = MagicMock()
    owner_id = uuid4()
    scenarios = [SimpleNamespace(id=uuid4(), name="Night Mode")]
    db.scalars.return_value = scenarios

    result = scenario_service.list_scenarios(db, owner_id=owner_id)

    assert result == scenarios
    db.scalars.assert_called_once()


def test_run_scenario_executes_all_actions_via_device_core(monkeypatch) -> None:
    db = MagicMock()
    owner_id = uuid4()
    scenario_id = uuid4()
    light_id = uuid4()
    door_id = uuid4()
    light = SimpleNamespace(
        id=light_id,
        name="Main Light",
        type=DeviceType.LIGHT,
        status=DeviceStatus.OFF,
        room_id=uuid4(),
        owner_id=owner_id,
        created_at=datetime(2026, 4, 15, 12, 0, tzinfo=UTC),
        updated_at=datetime(2026, 4, 15, 12, 0, tzinfo=UTC),
    )
    door = SimpleNamespace(
        id=door_id,
        name="Front Door",
        type=DeviceType.DOOR,
        status=DeviceStatus.OPEN,
        room_id=uuid4(),
        owner_id=owner_id,
        created_at=datetime(2026, 4, 15, 12, 0, tzinfo=UTC),
        updated_at=datetime(2026, 4, 15, 12, 0, tzinfo=UTC),
    )
    scenario = SimpleNamespace(
        id=scenario_id,
        actions=[
            {"device_id": str(light_id), "action": "TURN_ON"},
            {"device_id": str(door_id), "action": "CLOSE"},
        ],
    )

    monkeypatch.setattr("app.services.scenario_service.get_scenario_or_404", lambda *args, **kwargs: scenario)

    validation_calls: list[list[ScenarioActionItem]] = []

    def fake_validate(db_arg, *, owner_id, actions):
        assert db_arg is db
        assert owner_id == owner_id_value
        validation_calls.append(actions)

    owner_id_value = owner_id
    monkeypatch.setattr("app.services.scenario_service._validate_scenario_actions", fake_validate)

    devices_by_id = {
        light_id: light,
        door_id: door,
    }
    monkeypatch.setattr(
        "app.services.scenario_service.device_service.get_device_or_404",
        lambda db_arg, *, device_id, owner_id: devices_by_id[device_id],
    )

    applied_actions: list[tuple] = []

    def fake_apply(db_arg, *, device, owner_id, action):
        assert db_arg is db
        applied_actions.append((device.id, owner_id, action))
        if action == DeviceAction.TURN_ON:
            device.status = DeviceStatus.ON
        if action == DeviceAction.CLOSE:
            device.status = DeviceStatus.CLOSED
        return device

    monkeypatch.setattr(
        "app.services.scenario_service.device_service._apply_device_action_to_device",
        fake_apply,
    )

    result = scenario_service.run_scenario(db, scenario_id=scenario_id, owner_id=owner_id)

    assert result.scenario_id == scenario_id
    assert result.executed_actions == 2
    assert [device.id for device in result.devices] == [light_id, door_id]
    assert applied_actions == [
        (light_id, owner_id, DeviceAction.TURN_ON),
        (door_id, owner_id, DeviceAction.CLOSE),
    ]
    db.commit.assert_called_once()
    assert db.refresh.call_count == 2


def test_run_scenario_does_not_commit_when_validation_fails(monkeypatch) -> None:
    db = MagicMock()
    owner_id = uuid4()
    scenario_id = uuid4()
    scenario = SimpleNamespace(
        id=scenario_id,
        actions=[{"device_id": str(uuid4()), "action": "TURN_ON"}],
    )

    monkeypatch.setattr("app.services.scenario_service.get_scenario_or_404", lambda *args, **kwargs: scenario)

    def fake_validate(*args, **kwargs):
        raise HTTPException(status_code=404, detail="Device not found")

    monkeypatch.setattr("app.services.scenario_service._validate_scenario_actions", fake_validate)

    with pytest.raises(HTTPException) as exc_info:
        scenario_service.run_scenario(db, scenario_id=scenario_id, owner_id=owner_id)

    assert exc_info.value.status_code == 404
    assert exc_info.value.detail == "Device not found"
    db.commit.assert_not_called()
    db.refresh.assert_not_called()
