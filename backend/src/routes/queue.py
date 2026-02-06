"""작업 큐 라우터"""
from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from src.config import get_settings
from src.database import get_db
from src.models.queue_item import QueueItem, QueueStatus
from src.repositories.issue_repository import IssueRepository
from src.repositories.queue_repository import QueueRepository
from src.services.queue_service import QueueService
from src.schemas.queue import QueueItemUpdate, QueueItemWithIssue, QueueStatsResponse

settings = get_settings()


async def require_api_key(x_api_key: str = Header(default="")):
    """워커 전용 API Key 검증"""
    if not settings.api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="API Key가 설정되지 않았습니다",
        )
    if x_api_key != settings.api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="유효하지 않은 API Key",
        )


public_router = APIRouter(prefix="/api/queue", tags=["queue"])

router = APIRouter(
    prefix="/api/queue",
    tags=["queue"],
    dependencies=[Depends(require_api_key)],
)


def get_queue_service(db: AsyncSession = Depends(get_db)) -> QueueService:
    return QueueService(QueueRepository(db), IssueRepository(db), db)


@public_router.get("/stats", response_model=QueueStatsResponse)
async def get_queue_stats(
    db: AsyncSession = Depends(get_db),
):
    """큐 상태 통계 조회"""
    result = await db.execute(
        select(QueueItem.status, func.count(QueueItem.id))
        .group_by(QueueItem.status)
    )
    counts = {row[0].value: row[1] for row in result.all()}
    return QueueStatsResponse(
        pending=counts.get("pending", 0),
        in_progress=counts.get("in_progress", 0),
        completed=counts.get("completed", 0),
        failed=counts.get("failed", 0),
        total=sum(counts.values()),
    )


@router.get("/next", response_model=QueueItemWithIssue, responses={200: {"model": QueueItemWithIssue}, 204: {"description": "No pending items"}})
async def get_next_queue_item(
    service: QueueService = Depends(get_queue_service),
):
    """다음 처리할 큐 아이템 조회 (에이전트/워커용)

    - 대기 중인 아이템 중 우선순위가 높고 생성 시간이 빠른 순으로 반환
    - 반환 시 상태가 IN_PROGRESS로 변경됨
    - 대기 중인 아이템이 없으면 null 반환
    """
    queue_item = await service.get_next_item()
    if not queue_item:
        return None
    return queue_item


@router.get("/{item_id}", response_model=QueueItemWithIssue)
async def get_queue_item(
    item_id: int,
    service: QueueService = Depends(get_queue_service),
):
    """큐 아이템 조회"""
    return await service.get_item(item_id)


@router.patch("/{item_id}", response_model=QueueItemWithIssue)
async def update_queue_item(
    item_id: int,
    data: QueueItemUpdate,
    service: QueueService = Depends(get_queue_service),
):
    """큐 아이템 상태 업데이트 (에이전트/워커용)

    - status: completed, failed 등으로 변경
    - result: 작업 결과 또는 에러 메시지
    """
    return await service.update_item_status(
        item_id,
        data.status,
        data.result,
    )
