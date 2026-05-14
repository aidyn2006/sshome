# SSHome — System Overview

> Diploma project. Smart home IoT platform: mobile app + cloud backend + ESP8266 firmware.
> Read this before touching the code.

---

## Table of Contents

1. [What This Is](#what-this-is)
2. [Architecture](#architecture)
3. [Device Types](#device-types)
4. [Security Model](#security-model)
5. [Workflows](#workflows)
6. [MQTT Protocol](#mqtt-protocol)
7. [API Reference](#api-reference)
8. [Key Files](#key-files)
9. [Running Locally](#running-locally)
10. [What's Next](#whats-next)

---

## What This Is

SSHome is a smart home control system where:

- **We (manufacturer)** produce ESP8266 devices with pre-flashed firmware and unique IDs.
- **Users** open the box, see the device ID on a card, type it in the mobile app.
- **The app** talks to our cloud backend over REST + WebSocket.
- **The backend** pushes commands to the device and receives telemetry — both via M QTT (HiveMQ Cloud).

No pairing wizard, no Bluetooth handshake, no config portal. User types one ID, done.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Mobile App (Expo/RN)                  │
│  Auth · Devices · Rooms · Scenarios · 3D Room View      │
└────────────────────┬───────────────────┬────────────────┘
                     │ REST + WebSocket   │
                     ▼                   │
┌─────────────────────────────────────┐  │
│         Backend (FastAPI)           │  │
│  /api/v1/...                        │  │
│  PostgreSQL (SQLAlchemy + Alembic)  │  │
│  JWT Auth (access + refresh tokens) │  │
│  Rate limiting · Audit logs         │  │
│  AI suggestions endpoint            │  │
└────────────┬──────────────┬─────────┘  │
             │ MQTT publish │ MQTT sub    │
             ▼              ▼            │
┌─────────────────────────────────────┐  │
│       HiveMQ Cloud (free tier)      │  │
│       TLS 8883                      │  │
└────────────┬──────────────┬─────────┘  │
             │ subscribe    │ publish     │
             ▼              ▼            │
┌─────────────────────────────────────┐  │
│          ESP8266 Firmware           │◄─┘
│  hardware_id + secret in flash      │
│  WiFi · paho/MQTT · DHT22 · SG90   │
└─────────────────────────────────────┘
```

**Stack:**
| Layer | Tech |ddd
|---|---|
| Mobile | React Native + Expo, TypeScript |
| Backend | Python 3.12, FastAPI, SQLAlchemy 2, Alembic |
| Database | PostgreSQL 16 |
| Broker | HiveMQ Cloud (free, up to 100 devices, TLS) |
| Firmware | ESP8266 / NodeMCU, Arduino/MicroPython |
| Infra | Docker Compose |

---

## Device Types

| Type | Controllable | MQTT Commands | Telemetry |
|---|---|---|---|
| `LIGHT` | Yes | `TURN_ON` / `TURN_OFF` | battery, rssi |
| `DOOR` | Yes | `OPEN` / `CLOSE` | battery, rssi |
| `AC` | Yes | `TURN_ON` / `TURN_OFF` | battery, rssi |
| `TEMP` | No (read-only) | — | temp, humidity, battery |
| `CAMERA` | No (decorative) | — | — |
| `MOTION` | No (decorative) | — | — |

Decorative types (`CAMERA`, `MOTION`) show an eye icon instead of a power button in the UI. They exist for visual completeness in the demo.

---

## Security Model

### Pre-Shared Key (PSK) — factory-generated

Every device gets a unique secret at manufacturing time. The user never sees it — it is baked into the firmware.

```
manufactured_devices.json   ← committed to repo, contains SHA-256 hashes only
manufactured_secrets.txt    ← NEVER committed (.gitignore), plaintext secrets for flashing
```

### Registration flow (who can add a device)

```
User types hardware_id in app
        ↓
Backend: is it in manufactured_devices.json?  → NO  → 422 "Device not found"
        ↓ YES
Backend: is it already claimed?               → YES → 409 "Already linked"
        ↓ NO
Backend: link device to user's account
        ↓
manufactured_devices.json: "claimed": true
```

A hardware_id can only ever be registered to **one account**. To transfer — admin resets `claimed` flag.

### MQTT message authentication

Every message from ESP must include its secret:

```json
{ "secret": "<64-char-hex>", "temp": 24.5, "battery": 80 }
```

The subscriber verifies `sha256(received_secret) == stored_hash`. Mismatch → message silently dropped, warning logged.

**What this protects against:**
- Fake devices publishing to someone else's topic → no secret → dropped
- Someone claiming another user's device → already `claimed` → 409
- Traffic sniffing → HiveMQ enforces TLS 1.2+

**What this does NOT protect against:**
- Physical flash dump of an ESP (accepted risk for consumer IoT)

---

## Workflows

### 1. Manufacturer (us) — generate a new device batch

```bash
python tools/generate_devices.py generate --count 10 --type LIGHT
python tools/generate_devices.py generate --count 5 --type DOOR
python tools/generate_devices.py list        # see all devices
```

This appends to `manufactured_devices.json` (hashes) and `manufactured_secrets.txt` (plaintext).

**Then:**
1. Flash each ESP with its `hardware_id` and plaintext `secret` from `manufactured_secrets.txt`
2. Print `hardware_id` on a card/sticker in the box
3. Ship

### 2. User — add a device

```
Open box → find card with "Device ID: sshome_20260513_a3f2"
         → open app → Add Device
         → type the ID, pick name, pick type, pick room
         → tap Add
```

Backend validates → device appears in the app immediately.

### 3. User — control a device

- **Toggle**: tap the power button on DeviceCard → `POST /api/v1/devices/{id}/toggle`
- **Direct action**: via scenario or API → `POST /api/v1/devices/{id}/action`
- Backend updates DB status → publishes MQTT command → pushes WebSocket update to app

### 4. ESP — send telemetry

```
Every N seconds:
  publish to devices/{hardware_id}/telemetry
  {
    "secret": "<hex>",
    "temp": 24.5,
    "humidity": 60,
    "battery": 85,
    "rssi": -65
  }
```

Backend subscriber:
- Verifies secret
- Updates `telemetry`, `battery_level`, `last_seen_at` in DB
- Clears `last_error`

### 5. ESP — report an error

```
publish to devices/{hardware_id}/errors
{
  "secret": "<hex>",
  "message": "DHT22 read failed after 3 retries"
}
```

Backend stores in `last_error`. App can display a warning badge on the device card.

### 6. User — delete a device

Tap delete in app → `DELETE /api/v1/devices/{id}` → device + all events removed.
Does NOT reset `claimed` in the registry — that requires a manual admin action (see What's Next).

---

## MQTT Protocol

**Broker:** HiveMQ Cloud, TLS port 8883

**Topic structure:**
```
devices/{hardware_id}/commands    ← backend → ESP
devices/{hardware_id}/telemetry   ← ESP → backend
devices/{hardware_id}/errors      ← ESP → backend
```

**Command payloads (backend → ESP):**

| Device | Action | Payload |
|---|---|---|
| LIGHT | TURN_ON | `{"action": "toggle_light", "value": 1}` |
| LIGHT | TURN_OFF | `{"action": "toggle_light", "value": 0}` |
| DOOR | OPEN | `{"action": "open_door", "value": 1}` |
| DOOR | CLOSE | `{"action": "close_door", "value": 0}` |
| AC | TURN_ON | `{"action": "toggle_ac", "value": 1}` |
| AC | TURN_OFF | `{"action": "toggle_ac", "value": 0}` |

**Telemetry payload (ESP → backend):**
```json
{
  "secret": "64-hex-chars",
  "temp": 24.5,
  "humidity": 60,
  "battery": 85,
  "rssi": -65
}
```
All fields except `secret` are optional. `secret` is stripped before storing in DB.

**Error payload (ESP → backend):**
```json
{
  "secret": "64-hex-chars",
  "message": "Human readable error description",
  "code": "OPTIONAL_ERROR_CODE"
}
```

---

## API Reference

Base URL: `http://localhost:8888/api/v1` (Docker) or `http://localhost:8000/api/v1` (dev)

All endpoints except `/auth/register` and `/auth/login` require `Authorization: Bearer <access_token>`.

### Auth
| Method | Path | Description |
|---|---|---|
| POST | `/auth/register` | Register new user |
| POST | `/auth/login` | Login, returns access + refresh tokens |
| POST | `/auth/refresh` | Refresh access token |
| POST | `/auth/logout` | Invalidate refresh token |

### Devices
| Method | Path | Description |
|---|---|---|
| GET | `/devices` | List all user's devices |
| POST | `/devices` | Register a device (validates against registry) |
| GET | `/devices/{id}` | Get single device |
| DELETE | `/devices/{id}` | Delete device (cascades events) |
| POST | `/devices/{id}/action` | Apply action (TURN_ON, OPEN, etc.) |
| POST | `/devices/{id}/toggle` | Toggle current state |

### Homes / Rooms
| Method | Path | Description |
|---|---|---|
| GET/POST | `/homes` | List / create homes |
| GET/POST | `/rooms` | List / create rooms |

### Scenarios
| Method | Path | Description |
|---|---|---|
| GET/POST | `/scenarios` | List / create scenarios |
| POST | `/scenarios/{id}/run` | Execute scenario (applies all actions) |

### Events
| Method | Path | Description |
|---|---|---|
| GET | `/events` | Activity log for the user |

### AI
| Method | Path | Description |
|---|---|---|
| GET | `/ai/suggestions` | Get automation suggestions based on home state |
| GET | `/state` | Get full home state snapshot |

### WebSocket
```
ws://host/ws/{owner_id}?token=<access_token>
```
Receives real-time device state updates pushed by the backend on every action.

---

## Key Files

```
sshome/
├── manufactured_devices.json       ← factory registry (hash only, safe to commit)
├── manufactured_secrets.txt        ← plaintext secrets for flashing (GITIGNORED)
├── tools/
│   └── generate_devices.py         ← batch device generator
│
├── backend/
│   ├── .env                        ← local secrets (GITIGNORED)
│   ├── .env.example                ← template
│   ├── alembic/versions/           ← DB migrations (run in order)
│   └── app/
│       ├── main.py                 ← FastAPI app, lifespan (loads registry + starts MQTT sub)
│       ├── core/config.py          ← all settings from env vars
│       ├── models/
│       │   ├── device.py           ← Device ORM model
│       │   └── enums.py            ← DeviceType, DeviceStatus, DeviceAction
│       ├── schemas/device.py       ← Pydantic schemas, hardware_id validation pattern
│       ├── services/
│       │   ├── device_service.py   ← business logic (create, delete, toggle, action)
│       │   ├── device_registry.py  ← manufactured_devices.json loader + validator
│       │   ├── mqtt_service.py     ← publishes commands to ESP (one-shot)
│       │   └── mqtt_subscriber.py  ← persistent listener for telemetry + errors
│       └── routes/devices.py       ← HTTP endpoints
│
└── frontend/mobile/src/
    ├── types/smartHome.ts          ← all shared TypeScript types
    ├── api/smartHome.ts            ← API client functions
    ├── store/SmartHomeContext.tsx  ← global state (auth, devices, rooms, scenarios)
    ├── utils/device.ts             ← icon helpers, action mapping, controllability check
    └── screens/
        ├── AddDeviceModalScreen.tsx
        └── DevicesScreen.tsx
```

### Database tables

| Table | Purpose |
|---|---|
| `users` | Accounts |
| `homes` | A user can have multiple homes |
| `rooms` | Belong to homes |
| `devices` | IoT devices. Key columns: `hardware_id`, `device_secret_hash`, `battery_level`, `last_error`, `last_seen_at`, `telemetry` (JSON) |
| `events` | Device action history, cascade-deleted with device |
| `scenarios` | Named action sequences |
| `refresh_tokens` | JWT refresh token store |
| `audit_logs` | Auth events |

---

## Running Locally

### Requirements
- Python 3.12+, Node 20+, Docker Desktop

### Backend (dev)
```bash
cd backend
python -m venv .venv && .venv/Scripts/activate
pip install -r requirements.txt
cp .env.example .env   # then fill in HiveMQ creds
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

Swagger UI: http://localhost:8000/docs

### Frontend (dev)
```bash
cd frontend/mobile
npm install
npx expo start
```

### Docker (full stack)
```bash
# create .env in root with HiveMQ creds:
# HIVEMQ_CLUSTER_URL=xxx.hivemq.cloud
# HIVEMQ_USERNAME=xxx
# HIVEMQ_PASSWORD=xxx

docker compose up --build
```

App: http://localhost:19006 · Backend: http://localhost:8888

### Migrations
```bash
cd backend
alembic upgrade head          # apply all migrations
alembic revision -m "name"    # create new migration
```

Current migrations (apply in order):
1. `20260415_0001` — core IoT schema
2. `20260508_0002` — auth schema
3. `20260513_0003` — device hardware_id
4. `20260513_0004` — device telemetry fields (battery, last_error, last_seen_at, JSON telemetry) + CAMERA/MOTION enum values
5. `20260513_0005` — device_secret_hash

---

## What's Next

### Short term (before demo)

- [ ] **Reset claimed device** — admin endpoint to unclaim a device (so it can be re-registered after account deletion or device swap)
- [ ] **ESP firmware sketch** — Arduino `.ino` with hardware_id + secret in flash, subscribes to commands, publishes telemetry. Reference implementation for the demo board.
- [ ] **Show `last_error` in UI** — warning badge on DeviceCard when `last_error` is set
- [ ] **Show battery level in UI** — battery icon on DeviceCard when `battery_level` is not null
- [ ] **Show `last_seen_at` in UI** — "Last seen 2m ago" in device detail

### Medium term

- [ ] **Device offline detection** — background job: if `last_seen_at` > 5 min, mark device status as `OFFLINE` (new status value), push WebSocket update
- [ ] **QR code on box** — encode `hardware_id` as QR so user can scan instead of type
- [ ] **Push notifications** — when device goes offline or reports error, send push to user (Expo Notifications)
- [ ] **Rooms arrangement** — let user drag devices between rooms in UI (already have room_id on device, just need the UI)
- [ ] **TEMP sensor history** — store telemetry snapshots in a separate `device_readings` table, show chart in app
- [ ] **Scenario scheduling** — run scenarios at a specific time (cron job, store schedule in DB)

### Production hardening

- [ ] **Per-device MQTT credentials** — instead of one shared HiveMQ account, provision each device with unique MQTT username/password. Requires HiveMQ Pro or self-hosted EMQX with ACL rules.
- [ ] **MQTT ACL** — each device can only publish to its own topics, preventing topic hijacking even with stolen credentials
- [ ] **JWT secret from env** — `AUTH_JWT_SECRET_KEY` is `super-secret-key` in defaults; enforce non-default in prod
- [ ] **Rate limiting on MQTT subscriber** — if a device publishes telemetry 1000x/second, add debounce
- [ ] **HTTPS / TLS on backend** — currently plain HTTP in dev; add nginx + Let's Encrypt in prod
- [ ] **Horizontal scaling** — mqtt_subscriber is a single thread; if we run multiple backend instances, each subscribes independently (fine for small scale, needs deduplication at scale)

### Nice to have

- [ ] **Guest access** — share home with family members (different owner_id, read-only or scoped permissions)
- [ ] **Webhook triggers** — call an external URL when a device changes state (IFTTT-style)
- [ ] **OTA firmware update** — backend publishes new firmware URL to `devices/{id}/ota`, ESP downloads and flashes
