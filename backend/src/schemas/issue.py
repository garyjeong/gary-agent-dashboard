"""일감 스키마"""
import re
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, field_validator
from src.models.issue import IssueStatus, IssuePriority
from src.schemas.label import LabelResponse

# GitHub owner/repo 형식: "owner/repo" (영문, 숫자, 하이픈, 점, 언더스코어)
_REPO_FULL_NAME_RE = re.compile(r"^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$")

# GitHub PR URL 형식
_PR_URL_RE = re.compile(r"^https://github\.com/[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+/pull/\d+$")


class IssueBase(BaseModel):
    """일감 기본 스키마"""
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    status: IssueStatus = IssueStatus.TODO
    priority: IssuePriority = IssuePriority.MEDIUM
    repo_full_name: Optional[str] = Field(None, max_length=255)
    pr_url: Optional[str] = Field(None, max_length=500)
    behavior_example: Optional[str] = None

    @field_validator("repo_full_name")
    @classmethod
    def validate_repo_full_name(cls, v: Optional[str]) -> Optional[str]:
        if v is None or v == "":
            return v
        if ".." in v or v.startswith("/"):
            raise ValueError("허용되지 않는 경로입니다")
        if not _REPO_FULL_NAME_RE.match(v):
            raise ValueError("리포지토리 이름은 'owner/repo' 형식이어야 합니다")
        return v

    @field_validator("pr_url")
    @classmethod
    def validate_pr_url(cls, v: Optional[str]) -> Optional[str]:
        if v is None or v == "":
            return v
        if not _PR_URL_RE.match(v):
            raise ValueError("PR URL은 'https://github.com/owner/repo/pull/번호' 형식이어야 합니다")
        return v


class IssueCreate(IssueBase):
    """일감 생성 스키마"""
    label_ids: List[int] = []


class IssueUpdate(BaseModel):
    """일감 수정 스키마 (부분 업데이트)"""
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    status: Optional[IssueStatus] = None
    priority: Optional[IssuePriority] = None
    repo_full_name: Optional[str] = Field(None, max_length=255)
    pr_url: Optional[str] = Field(None, max_length=500)
    behavior_example: Optional[str] = None
    label_ids: Optional[List[int]] = None

    @field_validator("repo_full_name")
    @classmethod
    def validate_repo_full_name(cls, v: Optional[str]) -> Optional[str]:
        if v is None or v == "":
            return v
        if ".." in v or v.startswith("/"):
            raise ValueError("허용되지 않는 경로입니다")
        if not _REPO_FULL_NAME_RE.match(v):
            raise ValueError("리포지토리 이름은 'owner/repo' 형식이어야 합니다")
        return v

    @field_validator("pr_url")
    @classmethod
    def validate_pr_url(cls, v: Optional[str]) -> Optional[str]:
        if v is None or v == "":
            return v
        if not _PR_URL_RE.match(v):
            raise ValueError("PR URL은 'https://github.com/owner/repo/pull/번호' 형식이어야 합니다")
        return v


class IssueResponse(IssueBase):
    """일감 응답 스키마"""
    id: int
    labels: List[LabelResponse] = []
    latest_queue_status: Optional[str] = None
    pr_status: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class IssueListResponse(BaseModel):
    """일감 목록 응답"""
    items: List[IssueResponse]
    total: int
