"""작업 큐 스키마"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field
from src.models.queue_item import QueueStatus
from src.schemas.issue import IssueResponse


class QueueItemCreate(BaseModel):
    """큐 아이템 생성 (작업 요청 시)"""
    issue_id: int
    priority: int = Field(default=0, ge=0, le=100)


class QueueItemUpdate(BaseModel):
    """큐 아이템 상태 업데이트"""
    status: QueueStatus
    result: Optional[str] = Field(None, max_length=50000)


class QueueItemResponse(BaseModel):
    """큐 아이템 응답"""
    id: int
    issue_id: int
    status: QueueStatus
    priority: int
    result: Optional[str]
    created_at: datetime
    started_at: Optional[datetime]
    completed_at: Optional[datetime]

    class Config:
        from_attributes = True


class QueueItemWithIssue(QueueItemResponse):
    """일감 정보 포함 큐 아이템"""
    issue: IssueResponse


class QueueStatsResponse(BaseModel):
    """큐 통계 응답"""
    pending: int = 0
    in_progress: int = 0
    completed: int = 0
    failed: int = 0
    total: int = 0
