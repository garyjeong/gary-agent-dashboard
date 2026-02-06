"""심층 분석 개선 제안 모델"""
from __future__ import annotations
import enum
from datetime import datetime
from typing import Optional, TYPE_CHECKING
from sqlalchemy import String, Text, DateTime, ForeignKey, Integer, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.database import Base

if TYPE_CHECKING:
    from src.models.connected_repo import ConnectedRepo


class SuggestionCategory(str, enum.Enum):
    CODE_QUALITY = "code_quality"
    SECURITY = "security"
    PERFORMANCE = "performance"
    ARCHITECTURE = "architecture"
    TESTING = "testing"
    DOCUMENTATION = "documentation"


class SuggestionSeverity(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class DeepAnalysisSuggestion(Base):
    """심층 분석에서 도출된 개선 제안"""
    __tablename__ = "deep_analysis_suggestions"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    connected_repo_id: Mapped[int] = mapped_column(
        ForeignKey("connected_repos.id", ondelete="CASCADE"), nullable=False
    )
    category: Mapped[SuggestionCategory] = mapped_column(
        SQLEnum(SuggestionCategory), nullable=False
    )
    severity: Mapped[SuggestionSeverity] = mapped_column(
        SQLEnum(SuggestionSeverity), nullable=False
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    affected_files: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    suggested_fix: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    issue_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("issues.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )

    connected_repo: Mapped["ConnectedRepo"] = relationship(
        back_populates="deep_analysis_suggestions"
    )
