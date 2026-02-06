"""연동된 리포지토리 모델"""
from __future__ import annotations
from datetime import datetime
from typing import Optional, List, TYPE_CHECKING
from sqlalchemy import String, Text, DateTime, ForeignKey, Boolean, Integer, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.database import Base

if TYPE_CHECKING:
    from src.models.deep_analysis_suggestion import DeepAnalysisSuggestion


class ConnectedRepo(Base):
    """사용자가 연동한 GitHub 리포지토리"""
    __tablename__ = "connected_repos"
    __table_args__ = (
        UniqueConstraint("user_id", "github_repo_id", name="uq_user_repo"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    github_repo_id: Mapped[int] = mapped_column(Integer, nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    language: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    private: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    html_url: Mapped[str] = mapped_column(String(500), nullable=False)
    default_branch: Mapped[str] = mapped_column(String(100), default="main", nullable=False)
    stargazers_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    connected_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    # 분석 관련
    analysis_status: Mapped[Optional[str]] = mapped_column(
        String(20), default="pending", nullable=True
    )
    analysis_result: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    analysis_error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    analyzed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # 심층 분석 (Phase 2)
    deep_analysis_status: Mapped[Optional[str]] = mapped_column(
        String(20), default=None, nullable=True
    )
    deep_analysis_result: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    deep_analysis_error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    deep_analyzed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # 관계
    deep_analysis_suggestions: Mapped[List["DeepAnalysisSuggestion"]] = relationship(
        "DeepAnalysisSuggestion",
        back_populates="connected_repo",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
