"""인증 라우터"""
from typing import Optional
from fastapi import APIRouter, Depends, Query, Response, Cookie
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

from src.config import get_settings
from src.database import get_db
from src.services.github_service import GitHubService
from src.schemas.auth import AuthURLResponse, UserResponse
from src.auth import (
    create_access_token,
    create_refresh_token,
    verify_token,
    get_current_user,
)
from src.models.user import User

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


@router.get("/github", response_model=AuthURLResponse)
async def github_login(
    redirect_uri: str = Query(default="http://localhost:5555/auth/callback"),
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
    return response


@router.get("/me", response_model=Optional[UserResponse])
async def get_me(
    user: Optional[User] = Depends(get_current_user),
):
    """현재 로그인 사용자 정보"""
    return user


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
    from sqlalchemy import select
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
