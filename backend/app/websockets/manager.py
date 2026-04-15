from collections import defaultdict
from uuid import UUID

from fastapi import WebSocket
from starlette.websockets import WebSocketDisconnect


class WebSocketManager:
    def __init__(self) -> None:
        self._connections: dict[UUID, set[WebSocket]] = defaultdict(set)

    async def connect(self, websocket: WebSocket, *, owner_id: UUID) -> None:
        await websocket.accept()
        self._connections[owner_id].add(websocket)

    def disconnect(self, websocket: WebSocket, *, owner_id: UUID) -> None:
        owner_connections = self._connections.get(owner_id)
        if owner_connections is None:
            return

        owner_connections.discard(websocket)
        if not owner_connections:
            self._connections.pop(owner_id, None)

    async def broadcast_to_owner(self, *, owner_id: UUID, message: dict) -> None:
        stale_connections: list[WebSocket] = []
        for websocket in list(self._connections.get(owner_id, ())):
            try:
                await websocket.send_json(message)
            except (RuntimeError, WebSocketDisconnect):
                stale_connections.append(websocket)

        for websocket in stale_connections:
            self.disconnect(websocket, owner_id=owner_id)


websocket_manager = WebSocketManager()
