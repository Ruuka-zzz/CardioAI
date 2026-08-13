"""Declarative base plus the id/timestamp columns every table shares."""

import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, String
from sqlalchemy.orm import declarative_base

Base = declarative_base()


def new_id() -> str:
    return str(uuid.uuid4())


class TimestampMixin:
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class IdMixin:
    id = Column(String, primary_key=True, default=new_id)