from datetime import datetime

from sqlalchemy import Column, String, Integer, Float, Text, JSON, DateTime
from sqlalchemy.sql import func

from ai_anidrama.infrastructure.persistence.sqlalchemy.engine import Base


class TaskModel(Base):
    __tablename__ = "tasks"

    id = Column(String, primary_key=True)
    project_id = Column(String, nullable=False, index=True)
    task_type = Column(String, nullable=False)
    media_type = Column(String, nullable=False)
    resource_id = Column(String, nullable=False)
    status = Column(String, nullable=False, default="pending")
    progress = Column(Float, nullable=False, default=0.0)
    message = Column(Text, nullable=True)
    payload = Column(JSON, nullable=True, default=dict)
    result = Column(JSON, nullable=True)
    error = Column(Text, nullable=True)
    user_id = Column(String, nullable=True)
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())


class ApiCallModel(Base):
    __tablename__ = "api_calls"

    id = Column(Integer, primary_key=True, autoincrement=True)
    provider = Column(String, nullable=False)
    model = Column(String, nullable=False)
    input_tokens = Column(Integer, nullable=False, default=0)
    output_tokens = Column(Integer, nullable=False, default=0)
    cost = Column(Float, nullable=False, default=0.0)
    duration = Column(Float, nullable=False, default=0.0)
    created_at = Column(DateTime, nullable=False, server_default=func.now())


class ApiKeyModel(Base):
    __tablename__ = "api_keys"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String, nullable=False)
    key_hash = Column(String, nullable=False, unique=True)
    key_prefix = Column(String, nullable=False)
    name = Column(String, nullable=False)
    expires_at = Column(DateTime, nullable=True)
    last_used_at = Column(DateTime, nullable=True)
    revoked_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())


class ConfigModel(Base):
    __tablename__ = "configs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    provider = Column(String, nullable=False, unique=True)
    config = Column(JSON, nullable=True)
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())


class CredentialModel(Base):
    __tablename__ = "credentials"

    id = Column(Integer, primary_key=True, autoincrement=True)
    key = Column(String, nullable=False)
    value = Column(Text, nullable=False)
    is_active = Column(Integer, nullable=False, default=1)
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())