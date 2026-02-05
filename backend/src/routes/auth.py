"""인증 라우터"""
from typing import Optional, Dict
import secrets
from fastapi import APIRouter, Depends, Query, Response, Cookie
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.services.github_service import GitHubService
from src.schemas.auth import AuthURLResponse, UserResponse, TokenResponse

router = APIRouter(prefix="/api/auth", tags=["auth"])

# 간단한 세션 저장소 (프로덕션에서는 Redis 등 사용)
sessions: Dict[str, int] = {}


def get_github_service(db: AsyncSession = Depends(get_db)) -> GitHubService:
    return GitHubService(db)


@router.get("/github", response_model=AuthURLResponse)
async def github_login(
    redirect_uri: str = Query(default="http://localhost:3000/auth/callback"),
    service: GitHubService = Depends(get_github_service),
):
    """GitHub OAuth 로그인 URL 반환"""
    url = service.get_authorize_url(redirect_uri)
    return AuthURLResponse(url=url)


@router.get("/github/callback")
async def github_callback(
    code: str,
    response: Response,
    service: GitHubService = Depends(get_github_service),
):
    """GitHub OAuth 콜백 처리"""
    # 토큰 교환
    access_token = await service.exchange_code_for_token(code)

    # 사용자 조회/생성
    user = await service.get_or_create_user(access_token)

    # 세션 생성
    session_id = secrets.token_urlsafe(32)
    sessions[session_id] = user.id

    # 쿠키 설정 및 응답
    response = RedirectResponse(url="http://localhost:3000", status_code=302)
    response.set_cookie(
        key="session_id",
        value=session_id,
        httponly=True,
        max_age=60 * 60 * 24 * 7,  # 7일
        samesite="lax",
    )
    return response


@router.get("/me", response_model=Optional[UserResponse])
async def get_current_user(
    session_id: Optional[str] = Cookie(default=None),
    service: GitHubService = Depends(get_github_service),
):
    """현재 로그인 사용자 정보"""
    if not session_id or session_id not in sessions:
        return None

    user_id = sessions[session_id]
    user = await service.get_user_by_id(user_id)
    return user


@router.post("/logout")
async def logout(
    response: Response,
    session_id: Optional[str] = Cookie(default=None),
):
    """로그아웃"""
    if session_id and session_id in sessions:
        del sessions[session_id]

    response.delete_cookie("session_id")
    return {"message": "로그아웃 완료"}
