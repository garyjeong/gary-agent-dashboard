"""작업 큐 서비스"""
from typing import Optional
import logging
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.issue import Issue, IssuePriority
from src.models.queue_item import QueueItem, QueueStatus
from src.repositories.queue_repository import QueueRepository
from src.repositories.issue_repository import IssueRepository
from src.services.telegram_service import TelegramService

logger = logging.getLogger(__name__)


class QueueService:
    """작업 큐 비즈니스 로직"""

    def __init__(
        self,
        queue_repository: QueueRepository,
        issue_repository: IssueRepository,
        db: Optional[AsyncSession] = None,
    ):
        self.queue_repository = queue_repository
        self.issue_repository = issue_repository
        self.db = db

    async def create_work_request(self, issue_id: int) -> QueueItem:
        """작업 요청 생성 (일감을 큐에 등록)"""
        # 일감 존재 확인
        issue = await self.issue_repository.get_by_id(issue_id)
        if not issue:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"일감을 찾을 수 없습니다: {issue_id}"
            )

        # 우선순위 변환 (high=2, medium=1, low=0)
        priority_map = {
            IssuePriority.HIGH: 2,
            IssuePriority.MEDIUM: 1,
            IssuePriority.LOW: 0,
        }

        queue_item = QueueItem(
            issue_id=issue_id,
            priority=priority_map.get(issue.priority, 1),
            status=QueueStatus.PENDING,
        )

        return await self.queue_repository.create(queue_item)

    async def get_next_item(self) -> Optional[QueueItem]:
        """다음 처리할 큐 아이템 가져오기 (상태를 IN_PROGRESS로 변경)"""
        queue_item = await self.queue_repository.get_next_pending()

        if queue_item:
            await self.queue_repository.update_status(
                queue_item,
                QueueStatus.IN_PROGRESS
            )

        return queue_item

    async def update_item_status(
        self,
        item_id: int,
        new_status: QueueStatus,
        result: Optional[str] = None,
    ) -> QueueItem:
        """큐 아이템 상태 업데이트"""
        queue_item = await self.queue_repository.get_by_id(item_id)
        if not queue_item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"큐 아이템을 찾을 수 없습니다: {item_id}"
            )

        updated = await self.queue_repository.update_status(
            queue_item,
            new_status,
            result,
        )

        # 완료/실패 시 텔레그램 알림 전송
        if new_status in (QueueStatus.COMPLETED, QueueStatus.FAILED):
            try:
                telegram_service = TelegramService(self.db)
                await telegram_service.send_completion_notification(updated)
            except Exception as e:
                logger.error(f"텔레그램 알림 전송 실패: {e}")

        return updated

    async def get_item(self, item_id: int) -> QueueItem:
        """큐 아이템 조회"""
        queue_item = await self.queue_repository.get_by_id(item_id)
        if not queue_item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"큐 아이템을 찾을 수 없습니다: {item_id}"
            )
        return queue_item
