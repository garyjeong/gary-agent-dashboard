"""IssueService 단위 테스트"""
import pytest
from src.models.issue import Issue, IssueStatus, IssuePriority
from src.repositories.issue_repository import IssueRepository
from src.services.issue_service import IssueService
from src.schemas.issue import IssueCreate, IssueUpdate


@pytest.fixture
def issue_service(db_session):
    repo = IssueRepository(db_session)
    return IssueService(repo, db=db_session)


async def test_create_issue(issue_service):
    data = IssueCreate(title="테스트 일감", priority=IssuePriority.HIGH)
    issue = await issue_service.create_issue(data)

    assert issue.id is not None
    assert issue.title == "테스트 일감"
    assert issue.priority == IssuePriority.HIGH
    assert issue.status == IssueStatus.TODO


async def test_get_issue(issue_service):
    data = IssueCreate(title="조회 테스트")
    created = await issue_service.create_issue(data)

    found = await issue_service.get_issue(created.id)
    assert found.id == created.id
    assert found.title == "조회 테스트"


async def test_get_issue_not_found(issue_service):
    from fastapi import HTTPException
    with pytest.raises(HTTPException) as exc_info:
        await issue_service.get_issue(9999)
    assert exc_info.value.status_code == 404


async def test_update_issue(issue_service):
    data = IssueCreate(title="원래 제목")
    issue = await issue_service.create_issue(data)

    updated = await issue_service.update_issue(
        issue.id, IssueUpdate(title="변경된 제목", status=IssueStatus.IN_PROGRESS)
    )
    assert updated.title == "변경된 제목"
    assert updated.status == IssueStatus.IN_PROGRESS


async def test_delete_issue(issue_service):
    data = IssueCreate(title="삭제 테스트")
    issue = await issue_service.create_issue(data)

    await issue_service.delete_issue(issue.id)

    from fastapi import HTTPException
    with pytest.raises(HTTPException):
        await issue_service.get_issue(issue.id)


async def test_get_issues_with_filter(issue_service):
    await issue_service.create_issue(IssueCreate(title="할 일 1", status=IssueStatus.TODO))
    await issue_service.create_issue(IssueCreate(title="진행 중 1", status=IssueStatus.IN_PROGRESS))
    await issue_service.create_issue(IssueCreate(title="할 일 2", status=IssueStatus.TODO))

    items, total = await issue_service.get_issues(status_filter=IssueStatus.TODO)
    assert total == 2
    assert all(i.status == IssueStatus.TODO for i in items)


async def test_get_issues_with_search(issue_service):
    await issue_service.create_issue(IssueCreate(title="로그인 버그 수정"))
    await issue_service.create_issue(IssueCreate(title="회원가입 기능 추가"))
    await issue_service.create_issue(IssueCreate(title="로그아웃 구현"))

    items, total = await issue_service.get_issues(search="로그")
    assert total == 2
