from fastapi import FastAPI

from app.core.config import settings
from app.core.http_security import configure_http_security
from app.routes.auth import router as auth_router
from app.routes.auth_context import router as auth_context_router
from app.routes.devices import router as devices_router
from app.routes.events import router as events_router
from app.routes.homes import router as homes_router
from app.routes.rooms import router as rooms_router
from app.routes.scenarios import router as scenarios_router
from app.routes.system import router as system_router
from app.websockets.router import router as websockets_router

app = FastAPI(title=settings.app_name, version="0.1.0")
configure_http_security(app)

app.include_router(system_router)
app.include_router(auth_router, prefix="/auth")
app.include_router(auth_context_router, prefix=settings.api_v1_prefix)
app.include_router(devices_router, prefix=settings.api_v1_prefix)
app.include_router(events_router, prefix=settings.api_v1_prefix)
app.include_router(homes_router, prefix=settings.api_v1_prefix)
app.include_router(rooms_router, prefix=settings.api_v1_prefix)
app.include_router(scenarios_router, prefix=settings.api_v1_prefix)
app.include_router(websockets_router)
