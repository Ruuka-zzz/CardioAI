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
    # Consultation length. Also decides how many slots a working-hours
    # block yields — set it to your real consultation time, or the per-block
    # capacity limit will never bind.
    appointment_minutes: int = 30

    # How far ahead a PATIENT must cancel. Doctors are not held to this.
    cancellation_notice_hours: int = 2

    # Default ceiling for a new working-hours block. None = as many as fit.
    default_block_capacity: int | None = None
    availability_horizon_days: int = 14

    @property
    def origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()