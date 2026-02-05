"""GitHub API 라우터"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Cookie, Query
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.services.github_service import GitHubService, GitHubAPIService
from src.schemas.github import RepoResponse, RepoListResponse, RepoTreeResponse, TreeItemResponse
from src.routes.auth import sessions

router = APIRouter(prefix="/api/github", tags=["github"])


async def get_current_user_token(
    session_id: Optional[str] = Cookie(default=None),
    db: AsyncSession = Depends(get_db),
) -> str:
    """현재 사용자의 GitHub 토큰 가져오기"""
    if not session_id or session_id not in sessions:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="로그인이 필요합니다"
        )

    user_id = sessions[session_id]
    service = GitHubService(db)
    user = await service.get_user_by_id(user_id)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="사용자를 찾을 수 없습니다"
        )

    return user.github_access_token


@router.get("/repos", response_model=RepoListResponse)
async def get_repos(
    per_page: int = Query(default=30, ge=1, le=100),
    page: int = Query(default=1, ge=1),
    access_token: str = Depends(get_current_user_token),
):
    """사용자의 GitHub 리포지토리 목록 조회"""
    api = GitHubAPIService(access_token)
    repos = await api.get_repos(per_page=per_page, page=page)

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
        )
        for repo in repos
    ]

    return RepoListResponse(items=items)


@router.get("/repos/{owner}/{repo}/tree", response_model=RepoTreeResponse)
async def get_repo_tree(
    owner: str,
    repo: str,
    branch: str = Query(default="main"),
    access_token: str = Depends(get_current_user_token),
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
    access_token: str = Depends(get_current_user_token),
):
    """리포지토리 특정 경로 내용 조회"""
    api = GitHubAPIService(access_token)
    contents = await api.get_repo_structure(owner, repo, path)
    return contents
