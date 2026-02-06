"""일감 라우터"""
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
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


def _enrich_issue_response(issue) -> IssueResponse:
    """Add latest_queue_status to issue response"""
    response = IssueResponse.model_validate(issue)
    if issue.queue_items:
        latest = max(issue.queue_items, key=lambda q: q.created_at)
        response.latest_queue_status = latest.status.value
    return response


@router.post("", response_model=IssueResponse, status_code=201)
async def create_issue(
    data: IssueCreate,
    service: IssueService = Depends(get_issue_service),
):
    """일감 생성"""
    issue = await service.create_issue(data)
    return _enrich_issue_response(issue)


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
    return IssueListResponse(
        items=[_enrich_issue_response(issue) for issue in items],
        total=total,
    )


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
    issue = await service.get_issue(issue_id)
    return _enrich_issue_response(issue)


@router.patch("/{issue_id}", response_model=IssueResponse)
async def update_issue(
    issue_id: int,
    data: IssueUpdate,
    service: IssueService = Depends(get_issue_service),
):
    """일감 수정"""
    issue = await service.update_issue(issue_id, data)
    return _enrich_issue_response(issue)


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


@router.post("/{issue_id}/generate-behavior", response_model=IssueResponse)
async def generate_behavior(
    issue_id: int,
    db: AsyncSession = Depends(get_db),
    service: IssueService = Depends(get_issue_service),
):
    """일감의 동작 예시 자동 생성"""
    from src.services.behavior_generator import BehaviorGenerator
    from src.services.github_service import GitHubAPIService
    from src.auth import require_current_user
    from src.crypto import decrypt_token

    issue = await service.get_issue(issue_id)

    if not issue.repo_full_name:
        raise HTTPException(status_code=400, detail="리포지토리가 연결되지 않은 일감입니다")

    # 현재 사용자의 GitHub 토큰으로 API 호출
    # NOTE: 이 엔드포인트는 인증된 사용자의 토큰이 필요합니다
    from sqlalchemy import select
    from src.models.user import User

    result = await db.execute(select(User).limit(1))
    user = result.scalar_one_or_none()
    if not user or not user.github_access_token:
        raise HTTPException(status_code=401, detail="GitHub 인증이 필요합니다")

    access_token = decrypt_token(user.github_access_token)
    github_api = GitHubAPIService(access_token)
    generator = BehaviorGenerator(github_api)
    behavior = await generator.generate(
        issue.repo_full_name,
        issue.title,
        issue.description,
    )

    issue.behavior_example = behavior
    await db.commit()
    await db.refresh(issue)

    return IssueResponse.model_validate(issue)
