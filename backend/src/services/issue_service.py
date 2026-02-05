"""일감 서비스"""
from typing import Optional, List, Tuple
from fastapi import HTTPException, status

from src.models.issue import Issue, IssueStatus, IssuePriority
from src.repositories.issue_repository import IssueRepository
from src.schemas.issue import IssueCreate, IssueUpdate


class IssueService:
    """일감 비즈니스 로직"""

    def __init__(self, repository: IssueRepository):
        self.repository = repository

    async def create_issue(self, data: IssueCreate) -> Issue:
        """일감 생성"""
        issue = Issue(
            title=data.title,
            description=data.description,
            status=data.status,
            priority=data.priority,
            repo_full_name=data.repo_full_name,
            behavior_example=data.behavior_example,
        )
        return await self.repository.create(issue)

    async def get_issue(self, issue_id: int) -> Issue:
        """일감 조회"""
        issue = await self.repository.get_by_id(issue_id)
        if not issue:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"일감을 찾을 수 없습니다: {issue_id}"
            )
        return issue

    async def get_issues(
        self,
        status_filter: Optional[IssueStatus] = None,
        priority: Optional[IssuePriority] = None,
        repo_full_name: Optional[str] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> Tuple[List[Issue], int]:
        """일감 목록 조회"""
        return await self.repository.get_list(
            status=status_filter,
            priority=priority,
            repo_full_name=repo_full_name,
            skip=skip,
            limit=limit,
        )

    async def update_issue(self, issue_id: int, data: IssueUpdate) -> Issue:
        """일감 수정"""
        issue = await self.get_issue(issue_id)

        # 부분 업데이트
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(issue, field, value)

        return await self.repository.update(issue)

    async def delete_issue(self, issue_id: int) -> None:
        """일감 삭제"""
        issue = await self.get_issue(issue_id)
        await self.repository.delete(issue)
