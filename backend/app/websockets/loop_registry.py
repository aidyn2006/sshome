"""Holds a reference to the main asyncio event loop.

Background threads (the MQTT subscriber, the attack simulator) need a way to
schedule coroutines — such as WebSocket broadcasts — onto the loop that FastAPI
is actually running on. The loop is registered once during application startup.
"""

import asyncio

_main_loop: asyncio.AbstractEventLoop | None = None


def set_loop(loop: asyncio.AbstractEventLoop) -> None:
    global _main_loop
    _main_loop = loop


def get_loop() -> asyncio.AbstractEventLoop | None:
    return _main_loop
