"""의존성 주입 중앙화"""
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.repositories.issue_repository import IssueRepository
from src.repositories.queue_repository import QueueRepository
from src.services.issue_service import IssueService
from src.services.queue_service import QueueService


def get_issue_repository(db: AsyncSession = Depends(get_db)) -> IssueRepository:
    return IssueRepository(db)


def get_queue_repository(db: AsyncSession = Depends(get_db)) -> QueueRepository:
    return QueueRepository(db)


def get_issue_service(
    repo: IssueRepository = Depends(get_issue_repository),
    db: AsyncSession = Depends(get_db),
) -> IssueService:
    return IssueService(repo, db=db)


def get_queue_service(
    queue_repo: QueueRepository = Depends(get_queue_repository),
    issue_repo: IssueRepository = Depends(get_issue_repository),
    db: AsyncSession = Depends(get_db),
) -> QueueService:
    return QueueService(queue_repo, issue_repo, db)
