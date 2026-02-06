"""QueueService 단위 테스트"""
import pytest
from src.models.issue import IssuePriority
from src.models.queue_item import QueueStatus
from src.repositories.issue_repository import IssueRepository
from src.repositories.queue_repository import QueueRepository
from src.services.issue_service import IssueService
from src.services.queue_service import QueueService
from src.schemas.issue import IssueCreate


@pytest.fixture
async def services(db_session):
    issue_repo = IssueRepository(db_session)
    queue_repo = QueueRepository(db_session)
    issue_service = IssueService(issue_repo, db=db_session)
    queue_service = QueueService(queue_repo, issue_repo, db=db_session)
    return issue_service, queue_service


async def test_create_work_request(services):
    issue_service, queue_service = services
    issue = await issue_service.create_issue(
        IssueCreate(title="작업 요청 테스트", priority=IssuePriority.HIGH)
    )

    queue_item = await queue_service.create_work_request(issue.id)
    assert queue_item.issue_id == issue.id
    assert queue_item.status == QueueStatus.PENDING
    assert queue_item.priority == 2  # HIGH → 2


async def test_create_work_request_not_found(services):
    _, queue_service = services
    from fastapi import HTTPException
    with pytest.raises(HTTPException) as exc_info:
        await queue_service.create_work_request(9999)
    assert exc_info.value.status_code == 404


async def test_get_next_item(services):
    issue_service, queue_service = services
    issue = await issue_service.create_issue(IssueCreate(title="큐 테스트"))
    await queue_service.create_work_request(issue.id)

    next_item = await queue_service.get_next_item()
    assert next_item is not None
    assert next_item.status == QueueStatus.IN_PROGRESS


async def test_get_next_item_empty(services):
    _, queue_service = services
    next_item = await queue_service.get_next_item()
    assert next_item is None


async def test_update_item_status(services):
    issue_service, queue_service = services
    issue = await issue_service.create_issue(IssueCreate(title="상태 변경 테스트"))
    queue_item = await queue_service.create_work_request(issue.id)

    updated = await queue_service.update_item_status(
        queue_item.id, QueueStatus.COMPLETED, "성공적으로 완료"
    )
    assert updated.status == QueueStatus.COMPLETED
    assert updated.result == "성공적으로 완료"
    assert updated.completed_at is not None
