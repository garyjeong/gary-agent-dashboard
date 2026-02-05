"""작업 큐 아이템 모델"""
from __future__ import annotations
from datetime import datetime
from typing import Optional
from sqlalchemy import String, Text, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum

from src.database import Base


class QueueStatus(str, enum.Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"


class QueueItem(Base):
    """작업 큐 테이블"""
    __tablename__ = "queue_items"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    issue_id: Mapped[int] = mapped_column(ForeignKey("issues.id"), nullable=False)
    status: Mapped[QueueStatus] = mapped_column(
        SQLEnum(QueueStatus),
        default=QueueStatus.PENDING,
        nullable=False
    )
    priority: Mapped[int] = mapped_column(default=0, nullable=False)  # 높을수록 우선
    result: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # 관계
    issue: Mapped["Issue"] = relationship("Issue", back_populates="queue_items")
