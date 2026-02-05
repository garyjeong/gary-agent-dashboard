"""작업 큐 라우터"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.repositories.issue_repository import IssueRepository
from src.repositories.queue_repository import QueueRepository
from src.services.queue_service import QueueService
from src.schemas.queue import QueueItemUpdate, QueueItemWithIssue

router = APIRouter(prefix="/api/queue", tags=["queue"])


def get_queue_service(db: AsyncSession = Depends(get_db)) -> QueueService:
    return QueueService(QueueRepository(db), IssueRepository(db), db)


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
