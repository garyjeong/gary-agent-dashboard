"""일감(Issue) 모델"""
from __future__ import annotations
from datetime import datetime
from typing import Optional, List
from sqlalchemy import String, Text, DateTime, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum

from src.database import Base
from src.models.label import issue_labels


class IssueStatus(str, enum.Enum):
    TODO = "todo"
    IN_PROGRESS = "in_progress"
    DONE = "done"


class IssuePriority(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class Issue(Base):
    """일감 테이블"""
    __tablename__ = "issues"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[IssueStatus] = mapped_column(
        SQLEnum(IssueStatus),
        default=IssueStatus.TODO,
        nullable=False
    )
    priority: Mapped[IssuePriority] = mapped_column(
        SQLEnum(IssuePriority),
        default=IssuePriority.MEDIUM,
        nullable=False
    )
    repo_full_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    pr_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    pr_status: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)  # open, merged, closed
    behavior_example: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    assignee: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    due_date: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
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
    
    # 관계
    queue_items: Mapped[List["QueueItem"]] = relationship(
        "QueueItem",
        back_populates="issue",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    labels: Mapped[List["Label"]] = relationship(
        "Label",
        secondary=issue_labels,
        lazy="selectin",
    )
