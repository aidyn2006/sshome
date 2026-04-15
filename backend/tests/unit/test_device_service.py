from types import SimpleNamespace
from unittest.mock import MagicMock
from uuid import uuid4

import pytest
from fastapi import HTTPException

from app.models.enums import DeviceAction, DeviceStatus, DeviceType
from app.schemas.device import DeviceCreate
from app.services import device_service


@pytest.mark.parametrize(
    ("device_type", "expected_status"),
    [
        (DeviceType.LIGHT, DeviceStatus.OFF),
        (DeviceType.AC, DeviceStatus.OFF),
        (DeviceType.DOOR, DeviceStatus.CLOSED),
        (DeviceType.TEMP, DeviceStatus.OFF),
    ],
)
def test_default_status_matches_device_type(device_type: DeviceType, expected_status: DeviceStatus) -> None:
    assert device_service._default_status_for_device_type(device_type) == expected_status


def test_create_device_persists_owned_device_with_default_status(monkeypatch) -> None:
    db = MagicMock()
    owner_id = uuid4()
    room_id = uuid4()
    owned_room = SimpleNamespace(id=room_id)

    monkeypatch.setattr("app.services.device_service._get_owned_room", lambda *args, **kwargs: owned_room)

    device = device_service.create_device(
        db,
        owner_id=owner_id,
        payload=DeviceCreate(
            name="Front Door",
            type=DeviceType.DOOR,
            room_id=room_id,
        ),
    )

    db.add.assert_called_once_with(device)
    db.commit.assert_called_once()
    db.refresh.assert_called_once_with(device)
    assert device.name == "Front Door"
    assert device.type == DeviceType.DOOR
    assert device.status == DeviceStatus.CLOSED
    assert device.room_id == room_id
    assert device.owner_id == owner_id


def test_create_device_raises_404_when_room_is_not_owned(monkeypatch) -> None:
    db = MagicMock()
    owner_id = uuid4()
    room_id = uuid4()

    def fake_get_owned_room(*args, **kwargs):
        raise HTTPException(status_code=404, detail="Room not found")

    monkeypatch.setattr("app.services.device_service._get_owned_room", fake_get_owned_room)

    with pytest.raises(HTTPException) as exc_info:
        device_service.create_device(
            db,
            owner_id=owner_id,
            payload=DeviceCreate(
                name="Sensor",
                type=DeviceType.TEMP,
                room_id=room_id,
            ),
        )

    assert exc_info.value.status_code == 404
    assert exc_info.value.detail == "Room not found"
    db.add.assert_not_called()
    db.commit.assert_not_called()
    db.refresh.assert_not_called()


def test_list_devices_validates_home_scope_before_query(monkeypatch) -> None:
    db = MagicMock()
    owner_id = uuid4()
    home_id = uuid4()
    expected_devices = [SimpleNamespace(id=uuid4(), name="AC")]
    db.scalars.return_value = expected_devices

    calls: list[tuple] = []

    def fake_get_home_or_404(db_arg, *, home_id, owner_id):
        assert db_arg is db
        calls.append((home_id, owner_id))
        return SimpleNamespace(id=home_id)

    monkeypatch.setattr("app.services.device_service.get_home_or_404", fake_get_home_or_404)

    result = device_service.list_devices(db, owner_id=owner_id, home_id=home_id)

    assert result == expected_devices
    assert calls == [(home_id, owner_id)]
    db.scalars.assert_called_once()


def test_get_device_or_404_returns_404_for_missing_device() -> None:
    db = MagicMock()
    db.scalar.return_value = None

    with pytest.raises(HTTPException) as exc_info:
        device_service.get_device_or_404(
            db,
            device_id=uuid4(),
            owner_id=uuid4(),
        )

    assert exc_info.value.status_code == 404
    assert exc_info.value.detail == "Device not found"


@pytest.mark.parametrize(
    ("device_type", "action", "expected_status"),
    [
        (DeviceType.LIGHT, DeviceAction.TURN_ON, DeviceStatus.ON),
        (DeviceType.LIGHT, DeviceAction.TURN_OFF, DeviceStatus.OFF),
        (DeviceType.AC, DeviceAction.TURN_ON, DeviceStatus.ON),
        (DeviceType.DOOR, DeviceAction.OPEN, DeviceStatus.OPEN),
        (DeviceType.DOOR, DeviceAction.CLOSE, DeviceStatus.CLOSED),
    ],
)
def test_target_status_for_action_maps_supported_commands(
    device_type: DeviceType,
    action: DeviceAction,
    expected_status: DeviceStatus,
) -> None:
    assert (
        device_service._target_status_for_action(device_type=device_type, action=action)
        == expected_status
    )


@pytest.mark.parametrize(
    ("device_type", "action"),
    [
        (DeviceType.DOOR, DeviceAction.TURN_ON),
        (DeviceType.LIGHT, DeviceAction.OPEN),
        (DeviceType.TEMP, DeviceAction.TURN_ON),
    ],
)
def test_target_status_for_action_rejects_unsupported_commands(
    device_type: DeviceType,
    action: DeviceAction,
) -> None:
    with pytest.raises(HTTPException) as exc_info:
        device_service._target_status_for_action(device_type=device_type, action=action)

    assert exc_info.value.status_code == 422
    assert exc_info.value.detail == f"Action {action.value} is not supported for device type {device_type.value}"


def test_apply_device_action_updates_status_and_records_event(monkeypatch) -> None:
    db = MagicMock()
    owner_id = uuid4()
    device_id = uuid4()
    device = SimpleNamespace(
        id=device_id,
        type=DeviceType.LIGHT,
        status=DeviceStatus.OFF,
        owner_id=owner_id,
    )
    event = SimpleNamespace(device_id=device_id, owner_id=owner_id, action=DeviceAction.TURN_ON)

    monkeypatch.setattr("app.services.device_service.get_device_or_404", lambda *args, **kwargs: device)
    monkeypatch.setattr("app.services.device_service.event_service.create_device_event", lambda **kwargs: event)

    result = device_service.apply_device_action(
        db,
        device_id=device_id,
        owner_id=owner_id,
        action=DeviceAction.TURN_ON,
    )

    assert result is device
    assert device.status == DeviceStatus.ON
    db.add.assert_called_once_with(event)
    db.commit.assert_called_once()
    db.refresh.assert_called_once_with(device)


def test_apply_device_action_does_not_commit_when_action_is_not_supported(monkeypatch) -> None:
    db = MagicMock()
    owner_id = uuid4()
    device_id = uuid4()
    device = SimpleNamespace(
        id=device_id,
        type=DeviceType.TEMP,
        status=DeviceStatus.OFF,
        owner_id=owner_id,
    )

    monkeypatch.setattr("app.services.device_service.get_device_or_404", lambda *args, **kwargs: device)

    with pytest.raises(HTTPException) as exc_info:
        device_service.apply_device_action(
            db,
            device_id=device_id,
            owner_id=owner_id,
            action=DeviceAction.TURN_ON,
        )

    assert exc_info.value.status_code == 422
    db.add.assert_not_called()
    db.commit.assert_not_called()
    db.refresh.assert_not_called()
