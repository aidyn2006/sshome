import asyncio
from datetime import UTC, datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest

from app.models.enums import DeviceStatus, DeviceType
from app.schemas.device import DeviceRead
from app.services import mqtt_subscriber


@pytest.mark.asyncio
async def test_push_device_update_schedules_publish_on_configured_loop(monkeypatch) -> None:
    loop = asyncio.get_running_loop()
    mqtt_subscriber.configure(loop)

    publish_mock = AsyncMock()
    monkeypatch.setattr("app.websockets.publisher.publish_device_update", publish_mock)

    owner_id = uuid4()
    device_id = uuid4()
    room_id = uuid4()
    now = datetime.now(UTC)
    device = SimpleNamespace(
        id=device_id,
        owner_id=owner_id,
        name="Kitchen Temp",
        type=DeviceType.TEMP,
        status=DeviceStatus.ON,
        hardware_id="sshome_20260513_test01",
        room_id=room_id,
        battery_level=17,
        last_error=None,
        last_seen_at=None,
        telemetry={"temp": 1.5, "humidity": 55, "rssi": -62},
        created_at=now,
        updated_at=now,
        device_secret_hash=None,
    )

    mqtt_subscriber._push_device_update(device, source="telemetry")

    for _ in range(50):
        if publish_mock.await_count > 0:
            break
        await asyncio.sleep(0.01)

    publish_mock.assert_awaited_once()
    assert publish_mock.await_args.kwargs["source"] == "telemetry"
    assert publish_mock.await_args.kwargs["owner_id"] == owner_id
    assert isinstance(publish_mock.await_args.kwargs["device"], DeviceRead)


def test_get_status_reports_not_configured_without_client() -> None:
    mqtt_subscriber._client = None
    mqtt_subscriber._mqtt_connected = False

    status = mqtt_subscriber.get_status()

    assert status["mqtt_broker"] == "not_configured"
