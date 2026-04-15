from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    app_name: str = "IoT Auth Service"
    database_url: str = "postgresql+psycopg2://postgres:postgres@localhost:5432/iot_auth"
    jwt_secret_key: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7
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
