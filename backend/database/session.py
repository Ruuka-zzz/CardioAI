"""Engine and session factory.

Schema changes go through Alembic (see database/migrations/). init_db() is a
convenience for tests and first local runs only — never call it against a
database that migrations manage.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from config import get_settings
from models import Base

settings = get_settings()

connect_args = (
    {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}
)

engine = create_engine(
    settings.database_url,
    connect_args=connect_args,
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def init_db() -> None:
    """Create every table. Tests and local scratch only."""
    Base.metadata.create_all(bind=engine)


def get_db():
    """FastAPI dependency. One session per request, always closed."""
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()