from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "SSHome IoT Control System"
    environment: str = "development"
    api_v1_prefix: str = "/api/v1"
    database_url: str = "postgresql+psycopg2://postgres:postgres@localhost:5432/iot_control"
    database_echo: bool = False
    database_auto_init: bool = False
    auth_mode: Literal["jwt", "introspection"] = "jwt"
    auth_jwt_secret_key: str = "super-secret-key"
    auth_jwt_algorithm: str = "HS256"
    auth_jwt_issuer: str | None = None
    auth_jwt_audience: str | None = None
    auth_jwt_subject_claim: str = "sub"
    auth_jwt_owner_id_claim: str = "owner_id"
    auth_jwt_roles_claim: str = "roles"
    auth_jwt_role_claim: str = "role"
    auth_jwt_token_type_claim: str = "type"
    auth_jwt_access_token_type: str = "access"
    auth_introspection_url: str | None = None
    auth_introspection_timeout_seconds: float = 5.0
    jwt_secret_key: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7
    security_max_request_body_bytes: int = 64 * 1024
    security_rate_limit_window_seconds: int = 60
    security_device_action_rate_limit: int = 30
    security_scenario_run_rate_limit: int = 10
    security_websocket_connect_rate_limit: int = 20
    security_enable_hsts: bool = False
    scenario_max_actions: int = 20
    cors_allow_origins: str = (
        "http://localhost:19006,"
        "http://127.0.0.1:19006,"
        "http://localhost:8081,"
        "http://127.0.0.1:8081,"
        "http://localhost:3000,"
        "http://127.0.0.1:3000"
    )
    cors_allow_origin_regex: str = (
        r"^https?://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+)(:\d+)?$"
    )

    @property
    def cors_allow_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_allow_origins.split(",") if origin.strip()]


settings = Settings()
