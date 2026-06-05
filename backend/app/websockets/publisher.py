import logging
from functools import partial
from typing import Literal
from uuid import UUID

from anyio import from_thread

from app.models.enums import DeviceAction
from app.schemas.device import DeviceRead
from app.schemas.realtime import DeviceUpdatedMessage
from app.websockets.manager import websocket_manager

logger = logging.getLogger(__name__)


async def publish_device_update(
    *,
    owner_id: UUID,
    device: DeviceRead,
    source: Literal["device_action", "device_update", "scenario_run", "telemetry"],
    action: DeviceAction | None = None,
    scenario_id: UUID | None = None,
) -> None:
    message = DeviceUpdatedMessage(
        owner_id=owner_id,
        source=source,
        device=device,
        action=action,
        scenario_id=scenario_id,
    )
    logger.info("[WS] broadcasting device.updated to owner_id=%s source=%s device_id=%s", owner_id, source, device.id)
    await websocket_manager.broadcast_to_owner(
        owner_id=owner_id,
        message=message.model_dump(mode="json"),
    )
    logger.info("[WS] broadcast sent")


def publish_device_update_from_sync(
    *,
    owner_id: UUID,
    device: DeviceRead,
    source: Literal["device_action", "device_update", "scenario_run", "telemetry"],
    action: DeviceAction | None = None,
    scenario_id: UUID | None = None,
) -> None:
    from_thread.run(
        partial(
            publish_device_update,
            owner_id=owner_id,
            device=device,
            source=source,
            action=action,
            scenario_id=scenario_id,
        )
    )
