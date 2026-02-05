"""인증 관련 스키마"""
from typing import Optional
from pydantic import BaseModel


class AuthURLResponse(BaseModel):
    """OAuth 인증 URL 응답"""
    url: str


class UserResponse(BaseModel):
    """사용자 정보 응답"""
    id: int
    github_id: int
    github_login: str
    github_name: Optional[str]
    github_avatar_url: Optional[str]

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    """로그인 토큰 응답"""
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
