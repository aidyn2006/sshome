from functools import partial
from typing import Literal
from uuid import UUID

from anyio import from_thread

from app.models.enums import DeviceAction
from app.schemas.device import DeviceRead
from app.schemas.realtime import DeviceUpdatedMessage
from app.websockets.manager import websocket_manager


async def publish_device_update(
    *,
    owner_id: UUID,
    device: DeviceRead,
    source: Literal["device_action", "scenario_run"],
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
    await websocket_manager.broadcast_to_owner(
        owner_id=owner_id,
        message=message.model_dump(mode="json"),
    )


def publish_device_update_from_sync(
    *,
    owner_id: UUID,
    device: DeviceRead,
    source: Literal["device_action", "scenario_run"],
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
