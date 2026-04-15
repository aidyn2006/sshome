from datetime import UTC, datetime
from types import SimpleNamespace
from uuid import uuid4

import pytest
from starlette.websockets import WebSocketDisconnect

from app.core.config import settings
from app.db.session import get_db
from app.schemas.scenario import ScenarioRunResult
from tests.helpers import make_access_token, make_auth_headers


def test_devices_websocket_accepts_token_and_sends_connection_message(client) -> None:
    owner_id = "550e8400-e29b-41d4-a716-446655440000"
    token = make_access_token(owner_id, token_type="access")

    with client.websocket_connect(f"/ws/devices?token={token}") as websocket:
        message = websocket.receive_json()

    assert message == {
        "type": "connection.established",
        "owner_id": owner_id,
    }


def test_devices_websocket_rejects_missing_token(client) -> None:
    with pytest.raises(WebSocketDisconnect):
        with client.websocket_connect("/ws/devices"):
            pass


def test_devices_websocket_enforces_connection_rate_limit(client, monkeypatch) -> None:
    owner_id = "550e8400-e29b-41d4-a716-446655440000"
    token = make_access_token(owner_id, token_type="access")
    monkeypatch.setattr(settings, "security_websocket_connect_rate_limit", 1)

    with client.websocket_connect(f"/ws/devices?token={token}") as websocket:
        assert websocket.receive_json()["type"] == "connection.established"

    with pytest.raises(WebSocketDisconnect):
        with client.websocket_connect(f"/ws/devices?token={token}"):
            pass


def test_device_action_broadcasts_realtime_update(client, monkeypatch) -> None:
    owner_id = "550e8400-e29b-41d4-a716-446655440000"
    token = make_access_token(owner_id, token_type="access")
    fake_db = object()
    device_id = uuid4()
    room_id = uuid4()
    created_at = datetime(2026, 4, 15, 12, 0, tzinfo=UTC)
    updated_at = datetime(2026, 4, 15, 12, 5, tzinfo=UTC)

    client.app.dependency_overrides[get_db] = lambda: fake_db

    monkeypatch.setattr(
        "app.routes.devices.device_service.apply_device_action",
        lambda db, *, device_id, owner_id, action: SimpleNamespace(
            id=device_id,
            name="Main Light",
            type="LIGHT",
            status="ON",
            room_id=room_id,
            owner_id=owner_id,
            created_at=created_at,
            updated_at=updated_at,
        ),
    )

    with client.websocket_connect(f"/ws/devices?token={token}") as websocket:
        assert websocket.receive_json()["type"] == "connection.established"

        response = client.post(
            f"/api/v1/devices/{device_id}/action",
            json={"action": "TURN_ON"},
            headers=make_auth_headers(token),
        )

        assert response.status_code == 200
        message = websocket.receive_json()

    client.app.dependency_overrides.clear()

    assert message == {
        "type": "device.updated",
        "owner_id": owner_id,
        "source": "device_action",
        "action": "TURN_ON",
        "scenario_id": None,
        "device": {
            "id": str(device_id),
            "name": "Main Light",
            "type": "LIGHT",
            "status": "ON",
            "room_id": str(room_id),
            "owner_id": owner_id,
            "created_at": created_at.isoformat().replace("+00:00", "Z"),
            "updated_at": updated_at.isoformat().replace("+00:00", "Z"),
        },
    }


def test_scenario_run_broadcasts_each_updated_device(client, monkeypatch) -> None:
    owner_id = "550e8400-e29b-41d4-a716-446655440000"
    token = make_access_token(owner_id, token_type="access")
    fake_db = object()
    scenario_id = uuid4()
    light_id = uuid4()
    door_id = uuid4()
    created_at = datetime(2026, 4, 15, 12, 0, tzinfo=UTC)
    updated_at = datetime(2026, 4, 15, 12, 5, tzinfo=UTC)

    client.app.dependency_overrides[get_db] = lambda: fake_db

    monkeypatch.setattr(
        "app.routes.scenarios.scenario_service.run_scenario",
        lambda db, *, scenario_id, owner_id: ScenarioRunResult(
            scenario_id=scenario_id,
            executed_actions=2,
            devices=[
                {
                    "id": light_id,
                    "name": "Main Light",
                    "type": "LIGHT",
                    "status": "OFF",
                    "room_id": uuid4(),
                    "owner_id": owner_id,
                    "created_at": created_at,
                    "updated_at": updated_at,
                },
                {
                    "id": door_id,
                    "name": "Front Door",
                    "type": "DOOR",
                    "status": "CLOSED",
                    "room_id": uuid4(),
                    "owner_id": owner_id,
                    "created_at": created_at,
                    "updated_at": updated_at,
                },
            ],
        ),
    )

    with client.websocket_connect(f"/ws/devices?token={token}") as websocket:
        assert websocket.receive_json()["type"] == "connection.established"

        response = client.post(
            f"/api/v1/scenarios/{scenario_id}/run",
            headers=make_auth_headers(token),
        )

        assert response.status_code == 200
        first_message = websocket.receive_json()
        second_message = websocket.receive_json()

    client.app.dependency_overrides.clear()

    assert first_message["type"] == "device.updated"
    assert first_message["source"] == "scenario_run"
    assert first_message["scenario_id"] == str(scenario_id)
    assert second_message["type"] == "device.updated"
    assert second_message["source"] == "scenario_run"
    assert second_message["scenario_id"] == str(scenario_id)
    assert {first_message["device"]["id"], second_message["device"]["id"]} == {str(light_id), str(door_id)}
