"""작업 큐 리포지토리"""
from typing import Optional, List
from datetime import datetime
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.models.queue_item import QueueItem, QueueStatus


class QueueRepository:
    """작업 큐 DB 접근 계층"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, queue_item: QueueItem) -> QueueItem:
        """큐 아이템 생성"""
        self.db.add(queue_item)
        await self.db.commit()
        await self.db.refresh(queue_item)
        return queue_item

    async def get_by_id(self, item_id: int) -> Optional[QueueItem]:
        """ID로 큐 아이템 조회"""
        result = await self.db.execute(
            select(QueueItem)
            .options(selectinload(QueueItem.issue))
            .where(QueueItem.id == item_id)
        )
        return result.scalar_one_or_none()

    async def get_next_pending(self) -> Optional[QueueItem]:
        """다음 처리할 큐 아이템 조회 (우선순위 높은 순, 생성 순)

        with_for_update(skip_locked=True)를 사용해 다중 워커 동시 처리 시 중복 할당을 방지한다.
        SQLite에서는 무시되지만 Postgres 등에서는 잠금을 건다.
        """
        result = await self.db.execute(
            select(QueueItem)
            .options(selectinload(QueueItem.issue))
            .where(QueueItem.status == QueueStatus.PENDING)
            .order_by(QueueItem.priority.desc(), QueueItem.created_at.asc())
            .limit(1)
            .with_for_update(skip_locked=True)
        )
        return result.scalar_one_or_none()

    async def update_status(
        self,
        queue_item: QueueItem,
        status: QueueStatus,
        result: Optional[str] = None,
    ) -> QueueItem:
        """큐 아이템 상태 업데이트"""
        queue_item.status = status

        if status == QueueStatus.IN_PROGRESS:
            queue_item.started_at = datetime.utcnow()
        elif status in (QueueStatus.COMPLETED, QueueStatus.FAILED):
            queue_item.completed_at = datetime.utcnow()
            if result:
                queue_item.result = result

        await self.db.commit()
        await self.db.refresh(queue_item)
        return queue_item

    async def get_list_by_issue(self, issue_id: int) -> List[QueueItem]:
        """특정 일감의 큐 아이템 목록"""
        result = await self.db.execute(
            select(QueueItem)
            .where(QueueItem.issue_id == issue_id)
            .order_by(QueueItem.created_at.desc())
        )
        return list(result.scalars().all())
