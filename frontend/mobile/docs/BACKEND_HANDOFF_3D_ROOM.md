# 3D Room Backend Handoff

## Goal
Connect `Room3DScreen` controls to real backend state.

Screen file:
- `frontend/mobile/src/screens/Room3DScreen.tsx`

State/transport used by UI:
- `frontend/mobile/src/store/SmartHomeContext.tsx`
- `frontend/mobile/src/api/smartHome.ts`

## UI Controls To Wire

### 1) Light toggle
- Trigger: tap 3D lamp or HUD `Light` chip.
- Expected state:
  - `ON` -> send `TURN_OFF`
  - `OFF` -> send `TURN_ON`

### 2) Door toggle
- Trigger: tap 3D door or HUD `Door` chip.
- Expected state:
  - `OPEN` -> send `CLOSE`
  - `CLOSED` -> send `OPEN`

### 3) Window toggle
- Trigger: tap 3D window or HUD `Window` chip.
- Expected state:
  - `OPEN` -> send `CLOSE`
  - `CLOSED` -> send `OPEN`

### 4) Power ON ALL
- Trigger: button `POWER ON ALL`.
- Expected commands:
  - Light: `TURN_ON`
  - Door: `OPEN`
  - Window: `OPEN`

### 5) Power OFF ALL
- Trigger: button `POWER OFF ALL`.
- Expected commands:
  - Light: `TURN_OFF`
  - Door: `CLOSE`
  - Window: `CLOSE`

## Required Device Types/Statuses/Actions

Device types used by 3D room:
- `LIGHT`
- `DOOR`
- `WINDOW` (important: must exist in backend enum)

Statuses used:
- `ON`, `OFF`, `OPEN`, `CLOSED`

Actions used:
- `TURN_ON`, `TURN_OFF`, `OPEN`, `CLOSE`

## API Contract Expected By Current Frontend

## Auth
- Header: `Authorization: Bearer <token>`

## List devices
- `GET /api/v1/devices`
- Used to find the first device by type: `LIGHT`, `DOOR`, `WINDOW`

Response item shape:
```json
{
  "id": "uuid",
  "name": "Ceiling Light",
  "type": "LIGHT",
  "status": "ON",
  "room_id": "uuid",
  "owner_id": "uuid",
  "created_at": "iso-datetime",
  "updated_at": "iso-datetime"
}
```

## Apply action to device
- `POST /api/v1/devices/{deviceId}/action`
- Body:
```json
{
  "action": "TURN_ON"
}
```

- Response: updated device object with new `status`.

## Notes For Backend Developer

1. `WINDOW` support is mandatory for full 3D parity.
2. Endpoint should be idempotent enough for fast repeated taps.
3. Return updated device status immediately after action execution.
4. If action cannot be applied, return clear JSON error:
```json
{
  "error": "Human-readable message"
}
```

## Optional Improvement (Recommended)

Add batch endpoint to avoid 3 sequential calls for ON/OFF ALL:
- `POST /api/v1/rooms/{roomId}/actions`

Body example:
```json
{
  "actions": [
    { "device_type": "LIGHT", "action": "TURN_ON" },
    { "device_type": "DOOR", "action": "OPEN" },
    { "device_type": "WINDOW", "action": "OPEN" }
  ]
}
```

Frontend can switch to this endpoint later, but current implementation already works with per-device action calls.
