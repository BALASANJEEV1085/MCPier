from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Supabase / Postgres
    DATABASE_URL: str = (
        "postgresql+asyncpg://postgres:postgres@localhost:5432/mcpier"
    )

    # Fernet symmetric key for API key encryption at rest
    # Generate: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
    SECRET_KEY: str = "CHANGE-ME"

    # CORS
    CORS_ORIGINS: str = "http://localhost:3000,http://192.168.0.4:3000"

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",")]

    APP_VERSION: str = "0.1.0"
    APP_TITLE: str = "MCPier Backend"
    APP_PORT: int = 8300


settings = Settings()
