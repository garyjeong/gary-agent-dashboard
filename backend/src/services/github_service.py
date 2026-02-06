"""GitHub OAuth 및 API 서비스"""
from typing import Optional, List
import httpx
import re
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.config import get_settings
from src.crypto import encrypt_token
from src.http_client import request_with_retry, DEFAULT_TIMEOUT
from src.models.user import User

settings = get_settings()

GITHUB_AUTHORIZE_URL = "https://github.com/login/oauth/authorize"
GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token"
GITHUB_API_URL = "https://api.github.com"
HTTP_TIMEOUT = DEFAULT_TIMEOUT


class GitHubService:
    """GitHub OAuth 및 API 서비스"""

    def __init__(self, db: AsyncSession):
        self.db = db

    def get_authorize_url(self, redirect_uri: str) -> str:
        """GitHub OAuth 인증 URL 생성"""
        params = {
            "client_id": settings.github_client_id,
            "redirect_uri": redirect_uri,
            "scope": "public_repo read:user",
        }
        query = "&".join(f"{k}={v}" for k, v in params.items())
        return f"{GITHUB_AUTHORIZE_URL}?{query}"

    async def exchange_code_for_token(self, code: str) -> str:
        """인증 코드를 액세스 토큰으로 교환"""
        async with httpx.AsyncClient(timeout=HTTP_TIMEOUT) as client:
            response = await client.post(
                GITHUB_TOKEN_URL,
                data={
                    "client_id": settings.github_client_id,
                    "client_secret": settings.github_client_secret,
                    "code": code,
                },
                headers={"Accept": "application/json"},
            )

            if response.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="GitHub 토큰 교환 실패"
                )

            data = response.json()
            access_token = data.get("access_token")

            if not access_token:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=data.get("error_description", "토큰 획득 실패")
                )

            return access_token

    async def get_github_user(self, access_token: str) -> dict:
        """GitHub 사용자 정보 조회"""
        async with httpx.AsyncClient(timeout=HTTP_TIMEOUT) as client:
            response = await client.get(
                f"{GITHUB_API_URL}/user",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Accept": "application/vnd.github+json",
                },
            )

            if response.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="GitHub 사용자 정보 조회 실패"
                )

            return response.json()

    async def get_or_create_user(self, access_token: str) -> User:
        """GitHub 사용자 조회 또는 생성"""
        github_user = await self.get_github_user(access_token)

        # 기존 사용자 조회
        result = await self.db.execute(
            select(User).where(User.github_id == github_user["id"])
        )
        user = result.scalar_one_or_none()

        encrypted = encrypt_token(access_token)

        if user:
            # 토큰 및 정보 업데이트
            user.github_access_token = encrypted
            user.github_login = github_user["login"]
            user.github_name = github_user.get("name")
            user.github_avatar_url = github_user.get("avatar_url")
        else:
            # 새 사용자 생성
            user = User(
                github_id=github_user["id"],
                github_login=github_user["login"],
                github_name=github_user.get("name"),
                github_avatar_url=github_user.get("avatar_url"),
                github_access_token=encrypted,
            )
            self.db.add(user)

        await self.db.commit()
        await self.db.refresh(user)
        return user

    async def get_user_by_id(self, user_id: int) -> Optional[User]:
        """ID로 사용자 조회"""
        result = await self.db.execute(
            select(User).where(User.id == user_id)
        )
        return result.scalar_one_or_none()


class GitHubAPIService:
    """GitHub API 호출 서비스"""

    def __init__(self, access_token: str):
        self.access_token = access_token
        self.headers = {
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/vnd.github+json",
        }

    async def get_repos(self, per_page: int = 100, page: int = 1) -> List[dict]:
        """사용자 리포지토리 목록 조회 (단일 페이지)"""
        response = await request_with_retry(
            "GET",
            f"{GITHUB_API_URL}/user/repos",
            headers=self.headers,
            params={
                "per_page": per_page,
                "page": page,
                "sort": "updated",
                "direction": "desc",
            },
        )

        if response.status_code != 200:
            raise HTTPException(
                status_code=response.status_code,
                detail="리포지토리 목록 조회 실패"
            )

        return response.json()

    async def get_all_repos(self) -> List[dict]:
        """사용자의 전체 리포지토리 목록 조회 (모든 페이지 순회)"""
        all_repos: List[dict] = []
        page = 1
        per_page = 100  # GitHub API 최대값

        while True:
            repos = await self.get_repos(per_page=per_page, page=page)
            if not repos:
                break
            all_repos.extend(repos)
            if len(repos) < per_page:
                break
            page += 1

        return all_repos

    async def get_repo_structure(self, owner: str, repo: str, path: str = "") -> List[dict]:
        """리포지토리 디렉토리 구조 조회"""
        self._validate_owner_repo(owner, repo)
        self._validate_path(path)

        url = f"{GITHUB_API_URL}/repos/{owner}/{repo}/contents/{path}"
        response = await request_with_retry("GET", url, headers=self.headers)

        if response.status_code == 404:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="리포지토리 또는 경로를 찾을 수 없습니다"
            )

        if response.status_code != 200:
            raise HTTPException(
                status_code=response.status_code,
                detail="리포지토리 구조 조회 실패"
            )

        return response.json()

    _FALLBACK_BRANCHES = ["main", "master"]

    async def get_repo_tree(self, owner: str, repo: str, branch: str = "main") -> dict:
        """리포지토리 전체 트리 조회 (main → master 순으로 시도)"""
        self._validate_owner_repo(owner, repo)

        branches_to_try = (
            self._FALLBACK_BRANCHES if branch == "main" else [branch]
        )

        response = None
        for b in branches_to_try:
            url = f"{GITHUB_API_URL}/repos/{owner}/{repo}/git/trees/{b}?recursive=1"
            response = await request_with_retry("GET", url, headers=self.headers)
            if response.status_code == 200:
                return response.json()

        raise HTTPException(
            status_code=response.status_code if response else 500,
            detail="리포지토리 트리 조회 실패"
        )

    async def get_repo_issues(self, owner: str, repo: str, state: str = "open") -> list:
        """리포지토리 이슈 목록 조회"""
        self._validate_owner_repo(owner, repo)

        url = f"{GITHUB_API_URL}/repos/{owner}/{repo}/issues"
        response = await request_with_retry(
            "GET",
            url,
            headers=self.headers,
            params={"state": state, "per_page": 30, "sort": "updated"},
        )

        if response.status_code == 404:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="리포지토리를 찾을 수 없습니다",
            )

        if response.status_code != 200:
            raise HTTPException(
                status_code=response.status_code,
                detail="이슈 목록 조회 실패",
            )

        # GitHub API는 이슈 엔드포인트에서 PR도 반환하므로 필터링
        return [
            {
                "number": issue["number"],
                "title": issue["title"],
                "state": issue["state"],
                "html_url": issue["html_url"],
                "user": {
                    "login": issue["user"]["login"],
                    "avatar_url": issue["user"]["avatar_url"],
                },
                "labels": [
                    {"name": l["name"], "color": l["color"]}
                    for l in issue.get("labels", [])
                ],
                "body": issue.get("body"),
                "created_at": issue["created_at"],
                "updated_at": issue["updated_at"],
            }
            for issue in response.json()
            if "pull_request" not in issue
        ]

    async def get_single_issue(self, owner: str, repo: str, issue_number: int) -> dict:
        """리포지토리 단일 이슈 조회"""
        self._validate_owner_repo(owner, repo)

        url = f"{GITHUB_API_URL}/repos/{owner}/{repo}/issues/{issue_number}"
        response = await request_with_retry("GET", url, headers=self.headers)

        if response.status_code == 404:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="이슈를 찾을 수 없습니다",
            )

        if response.status_code != 200:
            raise HTTPException(
                status_code=response.status_code,
                detail="이슈 조회 실패",
            )

        return response.json()

    def _validate_owner_repo(self, owner: str, repo: str) -> None:
        """owner/repo 입력값 검증"""
        pattern = r"^[A-Za-z0-9_.-]+$"
        if not re.match(pattern, owner) or not re.match(pattern, repo):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="잘못된 리포지토리 식별자입니다",
            )

    def _validate_path(self, path: str) -> None:
        """경로 입력값 검증"""
        if ".." in path or path.startswith("/"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="허용되지 않는 경로입니다",
            )
