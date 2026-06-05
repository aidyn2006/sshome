from typing import Literal

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_DEFAULT_JWT_SECRET = "super-secret-key"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "SSHome IoT Control System"
    environment: str = "development"
    api_v1_prefix: str = "/api/v1"
    database_url: str = "postgresql+psycopg2://postgres:postgres@localhost:5432/iot_control"
    database_echo: bool = False
    database_auto_init: bool = False
    auth_mode: Literal["jwt", "introspection"] = "jwt"
    auth_jwt_secret_key: str = _DEFAULT_JWT_SECRET
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
    google_oauth_client_id: str | None = None
    google_oauth_jwks_url: str = "https://www.googleapis.com/oauth2/v3/certs"
    google_oauth_jwks_cache_seconds: int = 3600
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7
    security_max_request_body_bytes: int = 64 * 1024
    security_rate_limit_window_seconds: int = 60
    security_device_action_rate_limit: int = 30
    security_scenario_run_rate_limit: int = 10
    security_websocket_connect_rate_limit: int = 20
    security_login_rate_limit: int = 10
    security_enable_hsts: bool = False
    mqtt_enabled: bool = False
    mqtt_host: str = "localhost"
    mqtt_port: int = 1883
    mqtt_username: str | None = None
    mqtt_password: str | None = None
    mqtt_tls: bool = False
    mqtt_client_id: str = "sshome-backend"
    hivemq_cluster_url: str | None = None
    hivemq_username: str | None = None
    hivemq_password: str | None = None
    hivemq_port: int = 8883
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

    @model_validator(mode="after")
    def _forbid_default_secret_in_production(self) -> "Settings":
        if self.environment.lower() == "production" and self.auth_jwt_secret_key == _DEFAULT_JWT_SECRET:
            raise ValueError(
                "AUTH_JWT_SECRET_KEY must be set to a strong non-default value when ENVIRONMENT=production"
            )
        return self


settings = Settings()
