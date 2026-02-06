"""일감 라우터"""
from typing import Optional, List
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.models.issue import IssueStatus, IssuePriority
from src.models.queue_item import QueueItem
from src.dependencies import get_issue_service, get_queue_service
from src.services.issue_service import IssueService
from src.services.queue_service import QueueService
from src.schemas.issue import (
    IssueCreate,
    IssueUpdate,
    IssueResponse,
    IssueListResponse,
)
from src.schemas.queue import QueueItemResponse
from src.models.issue import Issue as IssueModel

router = APIRouter(prefix="/api/issues", tags=["issues"])


@router.post("", response_model=IssueResponse, status_code=201)
async def create_issue(
    data: IssueCreate,
    service: IssueService = Depends(get_issue_service),
):
    """일감 생성"""
    issue = await service.create_issue(data)
    return issue


@router.get("", response_model=IssueListResponse)
async def get_issues(
    status: Optional[IssueStatus] = None,
    priority: Optional[IssuePriority] = None,
    repo: Optional[str] = Query(None, alias="repo_full_name"),
    search: Optional[str] = Query(None, min_length=1, max_length=200),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    service: IssueService = Depends(get_issue_service),
):
    """일감 목록 조회 (필터링 + 검색)"""
    items, total = await service.get_issues(
        status_filter=status,
        priority=priority,
        repo_full_name=repo,
        search=search,
        skip=skip,
        limit=limit,
    )
    return IssueListResponse(items=items, total=total)


@router.get("/repos", response_model=List[str])
async def get_repos(
    db: AsyncSession = Depends(get_db),
):
    """일감에 등록된 고유 리포지토리 목록 조회"""
    result = await db.execute(
        select(IssueModel.repo_full_name)
        .where(IssueModel.repo_full_name.isnot(None))
        .distinct()
        .order_by(IssueModel.repo_full_name)
    )
    return [row for row in result.scalars().all()]


@router.get("/{issue_id}", response_model=IssueResponse)
async def get_issue(
    issue_id: int,
    service: IssueService = Depends(get_issue_service),
):
    """일감 상세 조회"""
    return await service.get_issue(issue_id)


@router.patch("/{issue_id}", response_model=IssueResponse)
async def update_issue(
    issue_id: int,
    data: IssueUpdate,
    service: IssueService = Depends(get_issue_service),
):
    """일감 수정"""
    return await service.update_issue(issue_id, data)


@router.delete("/{issue_id}", status_code=204)
async def delete_issue(
    issue_id: int,
    service: IssueService = Depends(get_issue_service),
):
    """일감 삭제"""
    await service.delete_issue(issue_id)


@router.get("/{issue_id}/queue-items", response_model=List[QueueItemResponse])
async def get_issue_queue_items(
    issue_id: int,
    db: AsyncSession = Depends(get_db),
):
    """일감의 작업 이력 조회"""
    result = await db.execute(
        select(QueueItem)
        .where(QueueItem.issue_id == issue_id)
        .order_by(QueueItem.created_at.desc())
    )
    return list(result.scalars().all())


@router.post("/{issue_id}/work-request", response_model=QueueItemResponse, status_code=201)
async def create_work_request(
    issue_id: int,
    service: QueueService = Depends(get_queue_service),
):
    """일감에 대한 작업 요청 등록 (큐에 추가)"""
    return await service.create_work_request(issue_id)
