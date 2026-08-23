"""Configuration, read once from the environment.

Every value that differs between local, docker, and production lives here.
Nothing else in the backend reads os.environ directly.
"""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # --- core ---
    secret_key: str
    database_url: str = "postgresql+psycopg://cardioai:changeme@localhost:5432/cardioai"
    token_ttl_hours: int = 12
    cors_origins: str = "http://localhost:3000"

    # --- sibling services (ports match docker/docker-compose.yml) ---
    ml_service_url: str = "http://ml-service:8001"
    prolog_engine_url: str = "http://prolog-engine:8002"
    rag_chatbot_url: str = "http://rag-chatbot:8003"
    notification_service_url: str = "http://notification-service:8004"

    service_timeout_seconds: float = 10.0

    # --- business rules ---
    appointment_minutes: int = 30
    availability_horizon_days: int = 14

    @property
    def origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()

    vapid_public_key: str = ""
    vapid_private_key: str = ""
    vapid_subject: str = ""
