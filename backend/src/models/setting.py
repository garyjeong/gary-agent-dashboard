"""설정 모델"""
from __future__ import annotations
from typing import Optional
from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column

from src.database import Base


class Setting(Base):
    """설정 테이블 (키-값 저장)"""
    __tablename__ = "settings"

    key: Mapped[str] = mapped_column(String(100), primary_key=True)
    value: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
