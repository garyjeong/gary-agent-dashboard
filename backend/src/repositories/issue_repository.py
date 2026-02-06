"""일감 리포지토리"""
from typing import Optional, List, Tuple
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.issue import Issue, IssueStatus, IssuePriority


class IssueRepository:
    """일감 DB 접근 계층"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, issue: Issue) -> Issue:
        """일감 생성"""
        self.db.add(issue)
        await self.db.commit()
        await self.db.refresh(issue)
        return issue

    async def get_by_id(self, issue_id: int) -> Optional[Issue]:
        """ID로 일감 조회"""
        result = await self.db.execute(
            select(Issue).where(Issue.id == issue_id)
        )
        return result.scalar_one_or_none()

    async def get_list(
        self,
        status: Optional[IssueStatus] = None,
        priority: Optional[IssuePriority] = None,
        repo_full_name: Optional[str] = None,
        search: Optional[str] = None,
        label_ids: Optional[List[int]] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> Tuple[List[Issue], int]:
        """일감 목록 조회 (필터링, 검색, 페이징)"""
        query = select(Issue)
        count_query = select(func.count(Issue.id))

        # 라벨 필터 (다대다 조인)
        if label_ids:
            from src.models.label import issue_labels
            query = query.join(issue_labels).where(issue_labels.c.label_id.in_(label_ids))
            count_query = count_query.join(issue_labels).where(issue_labels.c.label_id.in_(label_ids))

        # 필터 조건 빌드
        conditions = []
        if status:
            conditions.append(Issue.status == status)
        if priority:
            conditions.append(Issue.priority == priority)
        if repo_full_name:
            conditions.append(Issue.repo_full_name == repo_full_name)
        if search:
            search_pattern = f"%{search}%"
            conditions.append(
                Issue.title.ilike(search_pattern) | Issue.description.ilike(search_pattern)
            )

        for cond in conditions:
            query = query.where(cond)
            count_query = count_query.where(cond)

        # 정렬 및 페이징
        query = query.order_by(Issue.created_at.desc()).offset(skip).limit(limit)

        result = await self.db.execute(query)
        count_result = await self.db.execute(count_query)

        return list(result.scalars().all()), count_result.scalar_one()

    async def update(self, issue: Issue) -> Issue:
        """일감 수정"""
        await self.db.commit()
        await self.db.refresh(issue)
        return issue

    async def delete(self, issue: Issue) -> None:
        """일감 삭제"""
        await self.db.delete(issue)
        await self.db.commit()
