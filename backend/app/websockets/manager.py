import logging
from collections import defaultdict
from uuid import UUID

from fastapi import WebSocket
from starlette.websockets import WebSocketDisconnect

logger = logging.getLogger(__name__)


class WebSocketManager:
    def __init__(self) -> None:
        self._connections: dict[UUID, set[WebSocket]] = defaultdict(set)

    async def connect(self, websocket: WebSocket, *, owner_id: UUID) -> None:
        await websocket.accept()
        self._connections[owner_id].add(websocket)
        logger.info("[WS] client connected: owner_id=%s total_for_owner=%d", owner_id, len(self._connections[owner_id]))

    def disconnect(self, websocket: WebSocket, *, owner_id: UUID) -> None:
        owner_connections = self._connections.get(owner_id)
        if owner_connections is None:
            return

        owner_connections.discard(websocket)
        if not owner_connections:
            self._connections.pop(owner_id, None)

    async def broadcast_to_owner(self, *, owner_id: UUID, message: dict) -> None:
        connections = list(self._connections.get(owner_id, ()))
        logger.info("[WS] broadcast_to_owner: owner_id=%s connections=%d", owner_id, len(connections))

        stale_connections: list[WebSocket] = []
        for websocket in connections:
            try:
                await websocket.send_json(message)
                logger.info("[WS] message sent to client")
            except (RuntimeError, WebSocketDisconnect) as e:
                logger.info("[WS] send failed: %s", e)
                stale_connections.append(websocket)

        for websocket in stale_connections:
            self.disconnect(websocket, owner_id=owner_id)

    async def broadcast_all(self, *, message: dict) -> None:
        """Send a message to every connected client (used for the security feed)."""
        for owner_id in list(self._connections.keys()):
            await self.broadcast_to_owner(owner_id=owner_id, message=message)


websocket_manager = WebSocketManager()
