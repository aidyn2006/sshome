from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.http_security import configure_http_security
from app.db.init_db import init_db
from app.services import device_registry, mqtt_subscriber
from app.routes.ai import router as ai_router
from app.routes.admin import router as admin_router
from app.routes.auth import router as auth_router
from app.routes.auth_context import router as auth_context_router
from app.routes.devices import router as devices_router
from app.routes.events import router as events_router
from app.routes.homes import router as homes_router
from app.routes.logs import router as logs_router
from app.routes.rooms import router as rooms_router
from app.routes.scenes import router as scenes_router
from app.routes.scenarios import router as scenarios_router
from app.routes.system import router as system_router
from app.routes.users import router as users_router
from app.websockets.router import router as websockets_router


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    if settings.database_auto_init:
        init_db()
    device_registry.load()
    mqtt_subscriber.start()
    yield
    mqtt_subscriber.stop()


app = FastAPI(title=settings.app_name, version="0.1.0", lifespan=lifespan)
configure_http_security(app)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_allow_origins_list,
    allow_origin_regex=settings.cors_allow_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(system_router)
app.include_router(auth_router, prefix="/auth", tags=["auth"])
app.include_router(admin_router, prefix=settings.api_v1_prefix)
app.include_router(auth_context_router, prefix=settings.api_v1_prefix)
app.include_router(ai_router, prefix=settings.api_v1_prefix)
app.include_router(devices_router, prefix=settings.api_v1_prefix)
app.include_router(events_router, prefix=settings.api_v1_prefix)
app.include_router(homes_router, prefix=settings.api_v1_prefix)
app.include_router(rooms_router, prefix=settings.api_v1_prefix)
app.include_router(scenes_router, prefix=settings.api_v1_prefix)
app.include_router(scenarios_router, prefix=settings.api_v1_prefix)
app.include_router(users_router, prefix=f"{settings.api_v1_prefix}/users", tags=["users"])
app.include_router(logs_router, prefix=f"{settings.api_v1_prefix}/logs", tags=["logs"])
app.include_router(websockets_router)
