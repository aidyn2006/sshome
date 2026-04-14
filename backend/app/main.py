from fastapi import FastAPI

from app.db.init_db import init_db
from app.routes.auth import router as auth_router
from app.routes.logs import router as logs_router
from app.routes.users import router as users_router

app = FastAPI(title="IoT Auth Service", version="1.0.0")


@app.on_event("startup")
def on_startup() -> None:
    init_db()


@app.get("/health", tags=["health"])
def health() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(auth_router, prefix="/auth", tags=["auth"])
app.include_router(users_router, prefix="/users", tags=["users"])
app.include_router(logs_router, prefix="/logs", tags=["logs"])
