from fastapi import APIRouter, HTTPException, WebSocket
from starlette.websockets import WebSocketDisconnect

from app.core.auth import authenticate_access_token
from app.core.rate_limit import enforce_websocket_connect_rate_limit
from app.schemas.realtime import ConnectionEstablishedMessage
from app.websockets.manager import websocket_manager

router = APIRouter()


def _resolve_websocket_token(websocket: WebSocket) -> str | None:
    query_token = websocket.query_params.get("token")
    if query_token:
        return query_token

    authorization = websocket.headers.get("authorization")
    if not authorization:
        return None

    scheme, _, credentials = authorization.partition(" ")
    if scheme.lower() != "bearer" or not credentials:
        return None

    return credentials


@router.websocket("/ws/devices")
async def devices_websocket(websocket: WebSocket) -> None:
    token = _resolve_websocket_token(websocket)
    if token is None:
        await websocket.close(code=1008, reason="Missing bearer token")
        return

    try:
        auth_context = await authenticate_access_token(token)
    except HTTPException:
        await websocket.close(code=1008, reason="Could not validate credentials")
        return

    owner_id = auth_context.owner_id
    try:
        enforce_websocket_connect_rate_limit(websocket, str(owner_id))
    except HTTPException:
        await websocket.close(code=1013, reason="Connection rate limit exceeded")
        return

    await websocket_manager.connect(websocket, owner_id=owner_id)

    connected_message = ConnectionEstablishedMessage(owner_id=owner_id)
    await websocket.send_json(connected_message.model_dump(mode="json"))

    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        websocket_manager.disconnect(websocket, owner_id=owner_id)
