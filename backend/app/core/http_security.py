from collections.abc import Awaitable, Callable

from fastapi import FastAPI
from fastapi.responses import JSONResponse, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.datastructures import Headers
from starlette.requests import Request
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from app.core.config import settings


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable[[Request], Awaitable[Response]]) -> Response:
        response = await call_next(request)
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault("Referrer-Policy", "no-referrer")
        response.headers.setdefault(
            "Permissions-Policy",
            "camera=(), microphone=(), geolocation=()",
        )
        response.headers.setdefault("Cache-Control", "no-store")
        if settings.security_enable_hsts:
            response.headers.setdefault("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
        return response


class RequestBodyTooLargeError(Exception):
    pass


class RequestSizeLimitMiddleware:
    def __init__(self, app: ASGIApp, *, max_body_bytes: int | None = None) -> None:
        self.app = app
        self.max_body_bytes = max_body_bytes

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        max_body_bytes = self.max_body_bytes or settings.security_max_request_body_bytes
        headers = Headers(scope=scope)
        content_length = headers.get("content-length")
        if content_length is not None and int(content_length) > max_body_bytes:
            response = JSONResponse(
                status_code=413,
                content={
                    "detail": f"Request body is too large. Maximum allowed size is {max_body_bytes} bytes",
                },
            )
            await response(scope, receive, send)
            return

        received_bytes = 0

        async def limited_receive() -> Message:
            nonlocal received_bytes
            message = await receive()

            if message["type"] != "http.request":
                return message

            body = message.get("body", b"")
            received_bytes += len(body)
            if received_bytes > max_body_bytes:
                raise RequestBodyTooLargeError

            return message

        try:
            await self.app(scope, limited_receive, send)
        except RequestBodyTooLargeError:
            response = JSONResponse(
                status_code=413,
                content={
                    "detail": f"Request body is too large. Maximum allowed size is {max_body_bytes} bytes",
                },
            )
            await response(scope, receive, send)


def configure_http_security(app: FastAPI) -> None:
    app.add_middleware(SecurityHeadersMiddleware)
    app.add_middleware(
        RequestSizeLimitMiddleware,
        max_body_bytes=None,
    )
