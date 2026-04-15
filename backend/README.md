# SSHome IoT Control Backend

Main project launch instructions now live in the root README:

- [../README.md](../README.md)

Use the root guide if you want to start the whole project with Docker.

This file keeps backend-specific notes only.

## Auth Integration

The backend supports external authentication in two modes:

- `jwt` - validates the bearer token locally using a shared JWT secret
- `introspection` - calls an external auth endpoint and trusts its response

### JWT Mode

Expected access token behavior:

- bearer token in the `Authorization` header
- owner identifier comes from `owner_id` claim by default
- if `owner_id` is absent, the service falls back to `sub`
- if token `type` claim exists, it must be `access`

Protected dependency to use in future endpoints:

```python
from app.core.deps import CurrentOwnerId


@router.get("/protected")
def protected_endpoint(owner_id: CurrentOwnerId) -> dict[str, str]:
    return {"owner_id": str(owner_id)}
```

### Introspection Mode

Set `AUTH_MODE=introspection` and `AUTH_INTROSPECTION_URL`.

The backend sends:

- `Authorization: Bearer <token>`
- JSON body: `{"token": "<token>"}`

Expected response example:

```json
{
  "active": true,
  "owner_id": "550e8400-e29b-41d4-a716-446655440000",
  "sub": "550e8400-e29b-41d4-a716-446655440000",
  "roles": ["USER"],
  "type": "access"
}
```

## Run Locally

```powershell
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Backend will be available at `http://localhost:8000`.

## Health Endpoints

- `GET /`
- `GET /health`
- `GET /api/v1/auth-context/me`

## Realtime API

The backend exposes a WebSocket endpoint for realtime device updates:

- `GET /ws/devices`

Authentication is required. You can pass the access token in one of two ways:

- query param: `/ws/devices?token=<access_token>`
- header: `Authorization: Bearer <access_token>`

After a successful connection the client receives:

```json
{
  "type": "connection.established",
  "owner_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

When a device changes state through `POST /api/v1/devices/{id}/action`, the socket receives:

```json
{
  "type": "device.updated",
  "owner_id": "550e8400-e29b-41d4-a716-446655440000",
  "source": "device_action",
  "action": "TURN_ON",
  "scenario_id": null,
  "device": {
    "id": "b0c8fb19-cf1d-4d2b-b7a1-84f402f8b8b7",
    "name": "Main Light",
    "type": "LIGHT",
    "status": "ON",
    "room_id": "4fd0fa6d-4b66-4d73-844f-8a1f2d443f58",
    "owner_id": "550e8400-e29b-41d4-a716-446655440000",
    "created_at": "2026-04-15T12:00:00Z",
    "updated_at": "2026-04-15T12:05:00Z"
  }
}
```

When a device changes during `POST /api/v1/scenarios/{id}/run`, the socket receives the same message shape, but:

- `source` = `scenario_run`
- `scenario_id` contains the executed scenario id
- one message is sent for each updated device

### JavaScript / React Native Example

```ts
const apiBaseUrl = "http://localhost:8000";
const accessToken = "<access_token>";

const websocketUrl = apiBaseUrl
  .replace("http://", "ws://")
  .replace("https://", "wss://")
  .concat(`/ws/devices?token=${encodeURIComponent(accessToken)}`);

const socket = new WebSocket(websocketUrl);

socket.onopen = () => {
  console.log("Realtime connection opened");
};

socket.onmessage = (event) => {
  const message = JSON.parse(event.data);

  if (message.type === "connection.established") {
    console.log("Connected for owner:", message.owner_id);
    return;
  }

  if (message.type === "device.updated") {
    console.log("Updated device:", message.device);
  }
};

socket.onerror = (event) => {
  console.error("WebSocket error:", event);
};

socket.onclose = () => {
  console.log("Realtime connection closed");
};
```

### Notes

- updates are scoped by `owner_id`, so each user receives only their own device changes
- realtime messages are emitted after successful REST actions and scenario execution
- if you already use `EXPO_PUBLIC_API_BASE_URL`, derive the socket URL from the same base address by replacing `http` with `ws`

## Enhanced Security

The backend includes additional protections beyond authentication to support the "enhanced security" diploma scope:

- strict owner isolation: homes, rooms, devices, events, and scenarios are always filtered by `owner_id`
- command validation by device type: invalid actions such as `OPEN` for a light or `TURN_ON` for a temperature sensor are rejected
- audit trail through device events: each accepted control command creates an `Event`
- rate limiting for critical control flows:
  - device control requests
  - scenario execution requests
  - websocket connection attempts
- request body size limiting to reduce abuse through oversized payloads
- bounded scenario complexity through a maximum number of actions per scenario
- secure HTTP response headers:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Referrer-Policy: no-referrer`
  - restrictive `Permissions-Policy`
- realtime updates are scoped per owner, so one user cannot subscribe to another user's device changes

## Migrations

Create a migration:

```powershell
cd backend
alembic revision --autogenerate -m "create tables"
```

Apply migrations:

```powershell
cd backend
alembic upgrade head
```
