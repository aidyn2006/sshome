# IoT Auth Service (FastAPI)

## Run With Docker Compose

```bash
cd /path/to/SSHome
docker compose up --build
```

Backend will be available at `http://localhost:8000`.

## Run Locally (Without Docker)

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload
```

## Endpoints

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /users/me`
- `PUT /users/me`
- `GET /logs` (ADMIN only)
- `GET /health`
