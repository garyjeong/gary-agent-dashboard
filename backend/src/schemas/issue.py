"""일감 스키마"""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field
from src.models.issue import IssueStatus, IssuePriority


class IssueBase(BaseModel):
    """일감 기본 스키마"""
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    status: IssueStatus = IssueStatus.TODO
    priority: IssuePriority = IssuePriority.MEDIUM
    repo_full_name: Optional[str] = None
    behavior_example: Optional[str] = None


class IssueCreate(IssueBase):
    """일감 생성 스키마"""
    pass


class IssueUpdate(BaseModel):
    """일감 수정 스키마 (부분 업데이트)"""
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    status: Optional[IssueStatus] = None
    priority: Optional[IssuePriority] = None
    repo_full_name: Optional[str] = None
    behavior_example: Optional[str] = None


class IssueResponse(IssueBase):
    """일감 응답 스키마"""
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class IssueListResponse(BaseModel):
    """일감 목록 응답"""
    items: List[IssueResponse]
    total: int
