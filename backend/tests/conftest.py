from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker
from testcontainers.core.exceptions import ContainerStartException
from testcontainers.postgres import PostgresContainer

import app.models  # noqa: F401
from app.core.rate_limit import (
    device_action_limiter,
    scenario_run_limiter,
    websocket_connect_limiter,
)
from app.db.base import Base
from app.db.session import get_db
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


class IntegrationApiClient:
    def __init__(self, client: TestClient) -> None:
        self.client = client

    def register_user(
        self,
        *,
        email: str,
        password: str = "StrongPass123!",
        name: str = "Test User",
        phone: str | None = None,
    ) -> dict:
        response = self.client.post(
            "/auth/register",
            json={
                "email": email,
                "password": password,
                "name": name,
                "phone": phone,
            },
        )
        assert response.status_code == 201, response.text
        return response.json()

    def login_user(self, *, email: str, password: str = "StrongPass123!") -> dict:
        response = self.client.post(
            "/auth/login",
            json={
                "email": email,
                "password": password,
            },
        )
        assert response.status_code == 200, response.text
        return response.json()

    @staticmethod
    def auth_headers(access_token: str) -> dict[str, str]:
        return {"Authorization": f"Bearer {access_token}"}


@pytest.fixture(scope="session")
def postgres_container() -> Generator[PostgresContainer, None, None]:
    container = PostgresContainer("postgres:16-alpine")
    try:
        container.start()
    except ContainerStartException as exc:
        pytest.skip(f"Docker PostgreSQL test container could not be started: {exc}")
    except Exception as exc:  # pragma: no cover - defensive skip for Docker transport failures
        pytest.skip(f"Integration tests require Docker with PostgreSQL support: {exc}")

    try:
        yield container
    finally:
        container.stop()


@pytest.fixture
def integration_engine(postgres_container: PostgresContainer) -> Generator[Engine, None, None]:
    engine = create_engine(postgres_container.get_connection_url(), future=True, pool_pre_ping=True)
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    try:
        yield engine
    finally:
        Base.metadata.drop_all(bind=engine)
        engine.dispose()


@pytest.fixture
def integration_client(
    monkeypatch: pytest.MonkeyPatch,
    integration_engine: Engine,
) -> Generator[IntegrationApiClient, None, None]:
    session_factory = sessionmaker(bind=integration_engine, autoflush=False, autocommit=False, class_=Session)

    def override_get_db() -> Generator[Session, None, None]:
        db = session_factory()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    monkeypatch.setattr("app.routes.devices.publish_device_update_from_sync", lambda **kwargs: None)
    monkeypatch.setattr("app.routes.scenarios.publish_device_update_from_sync", lambda **kwargs: None)

    try:
        with TestClient(app) as test_client:
            yield IntegrationApiClient(test_client)
    finally:
        app.dependency_overrides.pop(get_db, None)
