# IoT Auth Service (FastAPI)

## Run

```bash
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

## Notes

- Passwords are hashed with `bcrypt`.
- API uses JWT access token in `Authorization: Bearer <token>`.
- Refresh tokens are stored in DB.
- Audit logs are recorded for register/login/logout.
