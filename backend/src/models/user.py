"""사용자 모델"""
from __future__ import annotations
from datetime import datetime
from typing import Optional
from sqlalchemy import String, Text, DateTime
from sqlalchemy.orm import Mapped, mapped_column

from src.database import Base


class User(Base):
    """사용자 테이블 (GitHub OAuth)"""
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    github_id: Mapped[int] = mapped_column(unique=True, nullable=False)
    github_login: Mapped[str] = mapped_column(String(100), nullable=False)
    github_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    github_avatar_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    github_access_token: Mapped[str] = mapped_column(Text, nullable=False)
    github_repo_token: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False
    )
