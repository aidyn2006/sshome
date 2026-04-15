from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient

from app.core.rate_limit import (
    device_action_limiter,
    scenario_run_limiter,
    websocket_connect_limiter,
)
from app.main import app


@pytest.fixture
def client() -> Generator[TestClient, None, None]:
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture(autouse=True)
def reset_rate_limiters() -> Generator[None, None, None]:
    device_action_limiter.reset()
    scenario_run_limiter.reset()
    websocket_connect_limiter.reset()
    yield
    device_action_limiter.reset()
    scenario_run_limiter.reset()
    websocket_connect_limiter.reset()
