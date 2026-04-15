# SSHome

SSHome is a smart home demo project with:

- `backend` - FastAPI + PostgreSQL
- `frontend/mobile` - Expo React Native app exported as a web build for Docker
- `docker-compose.yml` - the main way to run the whole stack

## Stack

- Frontend: React Native, Expo, React Navigation
- Backend: FastAPI, SQLAlchemy, Alembic
- Database: PostgreSQL 16
- Container runtime: Docker Compose

## What Starts In Docker

`docker compose up --build` starts 3 containers:

1. `sshome-db` - PostgreSQL database
2. `sshome-backend` - FastAPI backend on port `8000`
3. `sshome-frontend` - web build of the frontend on port `19006`

## Requirements

Before launch, make sure you have:

- Docker Desktop installed
- Docker Compose available
- ports `8000` and `19006` free

Check quickly:

```powershell
docker --version
docker compose version
```

## Quick Start With Docker

From the project root:

```powershell
docker compose up --build
```

If you want to run in background:

```powershell
docker compose up --build -d
```

After startup, open:

- Frontend: `http://localhost:19006`
- Backend health: `http://localhost:8000/health`
- Backend root: `http://localhost:8000/`

Expected health response:

```json
{"status":"ok"}
```

## First Launch Flow

1. Open `http://localhost:19006`
2. Create a new account on the registration screen
3. After registration, the frontend logs in automatically
4. If the account has no data yet, demo home/room/device/scenario data is created automatically
5. You can then control devices and run scenarios from the UI

## Useful Docker Commands

Start services:

```powershell
docker compose up --build
```

Start in background:

```powershell
docker compose up --build -d
```

See running containers:

```powershell
docker compose ps
```

See logs from all services:

```powershell
docker compose logs -f
```

See logs from backend only:

```powershell
docker compose logs -f backend
```

See logs from frontend only:

```powershell
docker compose logs -f frontend
```

See logs from database only:

```powershell
docker compose logs -f db
```

Stop services:

```powershell
docker compose down
```

Stop services and remove database volume:

```powershell
docker compose down -v
```

Rebuild only one service:

```powershell
docker compose build backend
docker compose build frontend
```

Restart one service:

```powershell
docker compose restart backend
docker compose restart frontend
```

## Ports

- `8000` -> backend
- `19006` -> frontend

If one of these ports is already busy, Docker will fail to start that service. Free the port or change the mapping in [docker-compose.yml](./docker-compose.yml).

## Project Structure

- `backend/`
- `frontend/mobile/`
- `docker-compose.yml`
- `README.md`

## Backend Endpoints You Will Use Most

Public auth endpoints:

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`

Protected API:

- `GET /api/v1/users/me`
- `GET /api/v1/homes`
- `GET /api/v1/rooms`
- `GET /api/v1/devices`
- `POST /api/v1/devices/{id}/action`
- `GET /api/v1/events`
- `GET /api/v1/scenarios`
- `POST /api/v1/scenarios/{id}/run`

Health:

- `GET /`
- `GET /health`

## WebSocket

The backend also exposes realtime device updates:

- `GET /ws/devices`

You can authenticate with:

- query string token: `/ws/devices?token=<access_token>`
- bearer token in `Authorization`

## Environment In Docker

Docker Compose already passes the needed environment variables. No `.env` file is required for the Docker launch.

Important defaults from compose:

- database name: `iot_control`
- database user: `postgres`
- database password: `postgres`
- backend auth mode: `jwt`
- backend port: `8000`
- frontend public URL: `http://localhost:19006`

## Clean Reset

If you want a fully clean project state, including deleting registered users and demo data:

```powershell
docker compose down -v
docker compose up --build
```

This removes the PostgreSQL volume and recreates the database from scratch.

## Troubleshooting

### Frontend opens, but login/register does not work

Check backend health first:

```powershell
Invoke-RestMethod http://localhost:8000/health
```

Then inspect logs:

```powershell
docker compose logs -f backend
docker compose logs -f frontend
```

### Containers do not start

Check compose status:

```powershell
docker compose ps
docker compose logs -f
```

Common reasons:

- Docker Desktop is not running
- port `8000` or `19006` is already used
- previous broken containers are still present

### Need to wipe the database

```powershell
docker compose down -v
```

### Code changed, but UI did not

Rebuild the frontend image:

```powershell
docker compose build frontend
docker compose up -d frontend
```

### Code changed in backend

Rebuild the backend image:

```powershell
docker compose build backend
docker compose up -d backend
```

## Local Development Without Docker

Docker is the recommended launch path, but local runs are also possible.

Backend:

```powershell
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Frontend:

```powershell
cd frontend\mobile
npm install
npm run start
```

For local frontend runs, configure `EXPO_PUBLIC_API_BASE_URL` according to your device or simulator.

## Additional Docs

- Backend notes: [backend/README.md](./backend/README.md)
- Frontend notes: [frontend/README.md](./frontend/README.md)
