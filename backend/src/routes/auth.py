"""인증 라우터"""
import asyncio
import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response, Cookie, status
from fastapi.responses import RedirectResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.config import get_settings
from src.database import get_db, async_session_maker
from src.services.github_service import GitHubService, GitHubAPIService
from src.services.gemini_service import GeminiAnalysisService
from src.schemas.auth import AuthURLResponse, UserResponse
from src.auth import (
    create_access_token,
    create_refresh_token,
    verify_token,
    get_current_user,
)
from src.crypto import decrypt_token
from src.models.user import User
from src.models.connected_repo import ConnectedRepo

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["auth"])
settings = get_settings()

# 쿠키 공통 설정
_cookie_kwargs = {
    "httponly": True,
    "samesite": "lax",
    "secure": not settings.debug,  # 프로덕션(HTTPS)에서만 secure
}


def get_github_service(db: AsyncSession = Depends(get_db)) -> GitHubService:
    return GitHubService(db)


def _set_auth_cookies(response: Response, user_id: int) -> None:
    """access_token + refresh_token 쿠키 설정"""
    access = create_access_token(user_id)
    refresh = create_refresh_token(user_id)

    response.set_cookie(
        key="access_token",
        value=access,
        max_age=settings.access_token_expire_minutes * 60,
        **_cookie_kwargs,
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh,
        max_age=settings.refresh_token_expire_days * 24 * 60 * 60,
        **_cookie_kwargs,
    )


def _clear_auth_cookies(response: Response) -> None:
    """인증 쿠키 삭제"""
    response.delete_cookie("access_token")
    response.delete_cookie("refresh_token")


async def _trigger_commit_analysis_on_login(user_id: int, repo_token: str) -> None:
    """로그인 시 미분석 연동 리포의 커밋 히스토리 분석을 백그라운드로 실행"""
    async with async_session_maker() as bg_db:
        try:
            result = await bg_db.execute(
                select(ConnectedRepo).where(
                    ConnectedRepo.user_id == user_id,
                    ConnectedRepo.commit_analysis_status.is_(None),
                )
            )
            repos = list(result.scalars().all())

            if not repos:
                return

            github_api = GitHubAPIService(repo_token)
            gemini_service = GeminiAnalysisService(github_api)

            for repo in repos:
                try:
                    owner, repo_name = repo.full_name.split("/", 1)
                    commits_data = await github_api.get_commits(
                        owner, repo_name, per_page=30
                    )
                    if commits_data:
                        await gemini_service.analyze_commits(
                            repo.id, bg_db, commits_data
                        )
                except Exception:
                    logger.exception(
                        "로그인 커밋 분석 실패: repo=%s", repo.full_name
                    )
        except Exception:
            logger.exception(
                "로그인 시 커밋 분석 트리거 실패: user_id=%d", user_id
            )


@router.get("/github", response_model=AuthURLResponse)
async def github_login(
    redirect_uri: str = Query(default="http://localhost:5555/api/auth/github/callback"),
    service: GitHubService = Depends(get_github_service),
):
    """GitHub OAuth 로그인 URL 반환"""
    url = service.get_authorize_url(redirect_uri)
    return AuthURLResponse(url=url)


@router.get("/github/callback")
async def github_callback(
    code: str,
    service: GitHubService = Depends(get_github_service),
):
    """GitHub OAuth 콜백 처리 — JWT 발급"""
    access_token = await service.exchange_code_for_token(code)
    user = await service.get_or_create_user(access_token)

    response = RedirectResponse(url="http://localhost:5555", status_code=302)
    _set_auth_cookies(response, user.id)

    # 로그인 시 미분석 리포의 커밋 분석 백그라운드 트리거
    if user.github_repo_token:
        user_id = user.id
        repo_token = decrypt_token(user.github_repo_token)
        asyncio.create_task(_trigger_commit_analysis_on_login(user_id, repo_token))

    return response


@router.get("/github/authorize-repos", response_model=AuthURLResponse)
async def github_authorize_repos(
    redirect_uri: str = Query(
        default="http://localhost:5556/api/auth/github/callback/repos"
    ),
    service: GitHubService = Depends(get_github_service),
):
    """GitHub 리포지토리 접근 권한 인증 URL 반환"""
    url = service.get_authorize_url(redirect_uri, scope="public_repo read:user")
    return AuthURLResponse(url=url)


@router.get("/github/callback/repos")
async def github_repos_callback(
    code: str,
    access_token: Optional[str] = Cookie(default=None),
    service: GitHubService = Depends(get_github_service),
):
    """GitHub 리포지토리 접근 권한 콜백 — repo 토큰 저장"""
    if not access_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="로그인이 필요합니다",
        )
    payload = verify_token(access_token, expected_type="access")
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="인증이 만료되었습니다",
        )
    user_id = int(payload["sub"])

    repo_token = await service.exchange_code_for_token(code)
    await service.save_repo_token(user_id, repo_token)

    return RedirectResponse(url="http://localhost:5555/github", status_code=302)


@router.get("/me", response_model=Optional[UserResponse])
async def get_me(
    user: Optional[User] = Depends(get_current_user),
):
    """현재 로그인 사용자 정보"""
    if not user:
        return None
    return UserResponse(
        id=user.id,
        github_id=user.github_id,
        github_login=user.github_login,
        github_name=user.github_name,
        github_avatar_url=user.github_avatar_url,
        has_repo_token=bool(user.github_repo_token),
    )


@router.post("/refresh")
async def refresh_tokens(
    response: Response,
    refresh_token: Optional[str] = Cookie(default=None),
    db: AsyncSession = Depends(get_db),
):
    """리프레시 토큰으로 액세스 토큰 갱신"""
    if not refresh_token:
        _clear_auth_cookies(response)
        return {"message": "리프레시 토큰 없음"}

    payload = verify_token(refresh_token, expected_type="refresh")
    if not payload:
        _clear_auth_cookies(response)
        return {"message": "리프레시 토큰 만료"}

    user_id = int(payload["sub"])

    # 사용자 존재 확인
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        _clear_auth_cookies(response)
        return {"message": "사용자 없음"}

    _set_auth_cookies(response, user_id)
    return {"message": "토큰 갱신 완료"}


@router.post("/logout")
async def logout(response: Response):
    """로그아웃 — 쿠키 삭제"""
    _clear_auth_cookies(response)
    return {"message": "로그아웃 완료"}
