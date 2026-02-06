"""일감 라우터"""
import asyncio
import logging
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db, async_session_maker
from src.models.issue import IssueStatus, IssuePriority
from src.models.issue import Issue as IssueModel
from src.models.queue_item import QueueItem
from src.models.user import User
from src.dependencies import get_issue_service, get_queue_service
from src.services.issue_service import IssueService
from src.services.queue_service import QueueService
from src.services.gemini_service import GeminiAnalysisService
from src.services.github_service import GitHubAPIService
from src.crypto import decrypt_token
from src.schemas.issue import (
    IssueCreate,
    IssueUpdate,
    IssueResponse,
    IssueListResponse,
)
from src.schemas.queue import QueueItemResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/issues", tags=["issues"])


def _enrich_issue_response(issue) -> IssueResponse:
    """Add latest_queue_status and pr_status to issue response"""
    response = IssueResponse.model_validate(issue)
    if issue.queue_items:
        latest = max(issue.queue_items, key=lambda q: q.created_at)
        response.latest_queue_status = latest.status.value
    if issue.pr_status:
        response.pr_status = issue.pr_status
    if issue.ai_plan_status:
        response.ai_plan_status = issue.ai_plan_status
    return response


async def _get_github_token(db: AsyncSession) -> Optional[str]:
    """사용자의 GitHub 리포 토큰 조회"""
    result = await db.execute(select(User).limit(1))
    user = result.scalar_one_or_none()
    if user and user.github_repo_token:
        return decrypt_token(user.github_repo_token)
    if user and user.github_access_token:
        return decrypt_token(user.github_access_token)
    return None


@router.post("", response_model=IssueResponse, status_code=201)
async def create_issue(
    data: IssueCreate,
    db: AsyncSession = Depends(get_db),
    service: IssueService = Depends(get_issue_service),
):
    """일감 생성 + AI 작업 계획 자동 생성"""
    issue = await service.create_issue(data)

    # description이 있으면 AI 작업 계획 백그라운드 생성
    if data.description and data.description.strip():
        issue_id = issue.id
        github_token = await _get_github_token(db)

        # 응답 반환 전에 상태를 generating으로 설정
        issue.ai_plan_status = "generating"
        await db.commit()
        await db.refresh(issue)

        async def _generate_plan():
            async with async_session_maker() as bg_db:
                try:
                    github_api = GitHubAPIService(github_token or "")
                    gemini_service = GeminiAnalysisService(github_api)
                    await gemini_service.generate_work_plan(issue_id, bg_db)
                except Exception:
                    logger.exception(
                        "Background work plan generation failed: issue_id=%d",
                        issue_id,
                    )

        asyncio.create_task(_generate_plan())

    return _enrich_issue_response(issue)


@router.get("", response_model=IssueListResponse)
async def get_issues(
    status: Optional[IssueStatus] = None,
    priority: Optional[IssuePriority] = None,
    repo: Optional[str] = Query(None, alias="repo_full_name"),
    search: Optional[str] = Query(None, min_length=1, max_length=200),
    label_ids: Optional[str] = Query(None, description="라벨 ID 목록 (쉼표 구분)"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    service: IssueService = Depends(get_issue_service),
):
    """일감 목록 조회 (필터링 + 검색)"""
    parsed_label_ids = (
        [int(x) for x in label_ids.split(",") if x.strip()]
        if label_ids
        else None
    )
    items, total = await service.get_issues(
        status_filter=status,
        priority=priority,
        repo_full_name=repo,
        search=search,
        label_ids=parsed_label_ids,
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
    """AI 작업 계획 재생성"""
    issue = await service.get_issue(issue_id)

    github_token = await _get_github_token(db)
    issue_id_val = issue.id

    async def _regenerate_plan():
        async with async_session_maker() as bg_db:
            try:
                github_api = GitHubAPIService(github_token or "")
                gemini_service = GeminiAnalysisService(github_api)
                await gemini_service.generate_work_plan(issue_id_val, bg_db)
            except Exception:
                logger.exception(
                    "Background work plan regeneration failed: issue_id=%d",
                    issue_id_val,
                )

    asyncio.create_task(_regenerate_plan())

    # 즉시 상태 업데이트
    issue.ai_plan_status = "generating"
    await db.commit()
    await db.refresh(issue)

    return _enrich_issue_response(issue)
