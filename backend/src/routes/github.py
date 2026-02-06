"""GitHub API 라우터"""
import asyncio
import logging
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db, async_session_maker
from src.services.github_service import GitHubService, GitHubAPIService
from src.services.gemini_service import GeminiAnalysisService
from src.schemas.github import (
    RepoResponse,
    RepoListResponse,
    RepoTreeResponse,
    TreeItemResponse,
    GitHubIssueResponse,
    ConnectRepoRequest,
    ConnectedRepoResponse,
    ConnectedRepoListResponse,
)
from src.schemas.issue import IssueResponse
from src.auth import require_current_user
from src.crypto import decrypt_token
from src.models.user import User
from src.models.issue import Issue, IssueStatus, IssuePriority
from src.models.connected_repo import ConnectedRepo

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/github", tags=["github"])


async def _get_github_token(
    user: User = Depends(require_current_user),
) -> str:
    """현재 사용자의 GitHub 토큰 가져오기 (JWT 인증 + 복호화)"""
    return decrypt_token(user.github_access_token)


@router.get("/repos", response_model=RepoListResponse)
async def get_repos(
    access_token: str = Depends(_get_github_token),
):
    """사용자의 GitHub 리포지토리 전체 목록 조회 (모든 페이지 순회)"""
    api = GitHubAPIService(access_token)
    repos = await api.get_all_repos()

    items = [
        RepoResponse(
            id=repo["id"],
            name=repo["name"],
            full_name=repo["full_name"],
            description=repo.get("description"),
            private=repo["private"],
            html_url=repo["html_url"],
            default_branch=repo.get("default_branch", "main"),
            updated_at=repo["updated_at"],
            language=repo.get("language"),
            stargazers_count=repo.get("stargazers_count", 0),
        )
        for repo in repos
    ]

    return RepoListResponse(items=items)


@router.get("/repos/{owner}/{repo}/tree", response_model=RepoTreeResponse)
async def get_repo_tree(
    owner: str,
    repo: str,
    branch: str = Query(default="main"),
    access_token: str = Depends(_get_github_token),
):
    """리포지토리 전체 파일 트리 조회"""
    api = GitHubAPIService(access_token)
    tree_data = await api.get_repo_tree(owner, repo, branch)

    tree_items = [
        TreeItemResponse(
            path=item["path"],
            type=item["type"],
            size=item.get("size"),
        )
        for item in tree_data.get("tree", [])
    ]

    return RepoTreeResponse(
        sha=tree_data["sha"],
        truncated=tree_data.get("truncated", False),
        tree=tree_items,
    )


@router.get("/repos/{owner}/{repo}/contents")
async def get_repo_contents(
    owner: str,
    repo: str,
    path: str = Query(default=""),
    access_token: str = Depends(_get_github_token),
):
    """리포지토리 특정 경로 내용 조회"""
    api = GitHubAPIService(access_token)
    contents = await api.get_repo_structure(owner, repo, path)
    return contents


@router.get(
    "/repos/{owner}/{repo}/issues",
    response_model=List[GitHubIssueResponse],
)
async def get_repo_issues(
    owner: str,
    repo: str,
    state: str = Query(default="open", pattern="^(open|closed|all)$"),
    access_token: str = Depends(_get_github_token),
):
    """GitHub 리포지토리 이슈 목록 조회"""
    api = GitHubAPIService(access_token)
    issues = await api.get_repo_issues(owner, repo, state=state)
    return issues


@router.post(
    "/repos/{owner}/{repo}/issues/{issue_number}/import",
    response_model=IssueResponse,
)
async def import_github_issue(
    owner: str,
    repo: str,
    issue_number: int,
    db: AsyncSession = Depends(get_db),
    access_token: str = Depends(_get_github_token),
):
    """GitHub 이슈를 대시보드 일감으로 가져오기"""
    api = GitHubAPIService(access_token)
    issue_data = await api.get_single_issue(owner, repo, issue_number)

    if "pull_request" in issue_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="PR은 가져올 수 없습니다",
        )

    new_issue = Issue(
        title=f"[{owner}/{repo}#{issue_number}] {issue_data['title']}",
        description=issue_data.get("body") or "",
        status=IssueStatus.TODO,
        priority=IssuePriority.MEDIUM,
        repo_full_name=f"{owner}/{repo}",
    )
    db.add(new_issue)
    await db.commit()
    await db.refresh(new_issue)

    return IssueResponse.model_validate(new_issue)


# ── 연동 리포지토리 관리 ──────────────────────────────────────

@router.get("/connected-repos", response_model=ConnectedRepoListResponse)
async def get_connected_repos(
    user: User = Depends(require_current_user),
    db: AsyncSession = Depends(get_db),
):
    """연동된 리포지토리 목록 조회"""
    result = await db.execute(
        select(ConnectedRepo)
        .where(ConnectedRepo.user_id == user.id)
        .order_by(ConnectedRepo.connected_at.desc())
    )
    repos = result.scalars().all()
    items = [
        ConnectedRepoResponse(
            id=r.id,
            github_repo_id=r.github_repo_id,
            full_name=r.full_name,
            name=r.name,
            description=r.description,
            language=r.language,
            private=r.private,
            html_url=r.html_url,
            default_branch=r.default_branch,
            stargazers_count=r.stargazers_count,
            connected_at=r.connected_at.isoformat(),
            analysis_status=r.analysis_status,
        )
        for r in repos
    ]
    return ConnectedRepoListResponse(items=items)


@router.post("/connected-repos", response_model=ConnectedRepoResponse, status_code=201)
async def connect_repo(
    body: ConnectRepoRequest,
    user: User = Depends(require_current_user),
    db: AsyncSession = Depends(get_db),
):
    """리포지토리 연동 추가"""
    # 중복 체크
    result = await db.execute(
        select(ConnectedRepo).where(
            ConnectedRepo.user_id == user.id,
            ConnectedRepo.github_repo_id == body.github_repo_id,
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="이미 연동된 리포지토리입니다",
        )

    repo = ConnectedRepo(
        user_id=user.id,
        github_repo_id=body.github_repo_id,
        full_name=body.full_name,
        name=body.name,
        description=body.description,
        language=body.language,
        private=body.private,
        html_url=body.html_url,
        default_branch=body.default_branch,
        stargazers_count=body.stargazers_count,
    )
    db.add(repo)
    await db.commit()
    await db.refresh(repo)

    # 백그라운드 분석 시작
    github_token = decrypt_token(user.github_access_token)
    repo_id = repo.id

    async def _run_analysis():
        async with async_session_maker() as bg_db:
            try:
                github_api = GitHubAPIService(github_token)
                service = GeminiAnalysisService(github_api)
                await service.analyze_repo(repo_id, bg_db)
            except Exception:
                logger.exception("Background analysis failed: repo_id=%d", repo_id)

    asyncio.create_task(_run_analysis())

    return ConnectedRepoResponse(
        id=repo.id,
        github_repo_id=repo.github_repo_id,
        full_name=repo.full_name,
        name=repo.name,
        description=repo.description,
        language=repo.language,
        private=repo.private,
        html_url=repo.html_url,
        default_branch=repo.default_branch,
        stargazers_count=repo.stargazers_count,
        connected_at=repo.connected_at.isoformat(),
        analysis_status=repo.analysis_status,
    )


@router.delete("/connected-repos/{github_repo_id}", status_code=204)
async def disconnect_repo(
    github_repo_id: int,
    user: User = Depends(require_current_user),
    db: AsyncSession = Depends(get_db),
):
    """리포지토리 연동 해제"""
    result = await db.execute(
        select(ConnectedRepo).where(
            ConnectedRepo.user_id == user.id,
            ConnectedRepo.github_repo_id == github_repo_id,
        )
    )
    repo = result.scalar_one_or_none()
    if not repo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="연동된 리포지토리를 찾을 수 없습니다",
        )

    await db.delete(repo)
    await db.commit()


# ── 분석 조회/재시도 ──────────────────────────────────────────

@router.get("/connected-repos/{repo_id}/analysis")
async def get_repo_analysis(
    repo_id: int,
    user: User = Depends(require_current_user),
    db: AsyncSession = Depends(get_db),
):
    """리포지토리 분석 결과 조회"""
    result = await db.execute(
        select(ConnectedRepo).where(
            ConnectedRepo.id == repo_id,
            ConnectedRepo.user_id == user.id,
        )
    )
    repo = result.scalar_one_or_none()
    if not repo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="연동된 리포지토리를 찾을 수 없습니다",
        )
    return {
        "analysis_status": repo.analysis_status,
        "analysis_result": repo.analysis_result,
        "analysis_error": repo.analysis_error,
        "analyzed_at": repo.analyzed_at.isoformat() if repo.analyzed_at else None,
    }


@router.post("/connected-repos/{repo_id}/analysis/retry")
async def retry_repo_analysis(
    repo_id: int,
    user: User = Depends(require_current_user),
    db: AsyncSession = Depends(get_db),
):
    """리포지토리 분석 재시도"""
    result = await db.execute(
        select(ConnectedRepo).where(
            ConnectedRepo.id == repo_id,
            ConnectedRepo.user_id == user.id,
        )
    )
    repo = result.scalar_one_or_none()
    if not repo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="연동된 리포지토리를 찾을 수 없습니다",
        )
    if repo.analysis_status == "analyzing":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="이미 분석이 진행 중입니다",
        )

    repo.analysis_status = "pending"
    repo.analysis_error = None
    await db.commit()

    github_token = decrypt_token(user.github_access_token)

    async def _run_analysis():
        async with async_session_maker() as bg_db:
            try:
                github_api = GitHubAPIService(github_token)
                service = GeminiAnalysisService(github_api)
                await service.analyze_repo(repo_id, bg_db)
            except Exception:
                logger.exception("Background analysis retry failed: repo_id=%d", repo_id)

    asyncio.create_task(_run_analysis())

    return {"message": "분석이 시작되었습니다", "analysis_status": "pending"}
