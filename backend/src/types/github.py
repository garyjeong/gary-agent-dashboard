"""GitHub API 응답 타입 정의"""
from typing import Optional, List
from pydantic import BaseModel


class GithubUser(BaseModel):
    """GitHub 사용자 정보"""
    id: int
    login: str
    name: Optional[str] = None
    avatar_url: Optional[str] = None
    html_url: Optional[str] = None


class GithubRepo(BaseModel):
    """GitHub 리포지토리 정보"""
    id: int
    name: str
    full_name: str
    private: bool = False
    html_url: str
    description: Optional[str] = None
    language: Optional[str] = None
    default_branch: str = "main"
    updated_at: Optional[str] = None


class GithubTreeItem(BaseModel):
    """GitHub 트리 아이템"""
    path: str
    mode: str
    type: str  # blob, tree
    sha: str
    size: Optional[int] = None


class GithubTree(BaseModel):
    """GitHub 리포지토리 트리"""
    sha: str
    tree: List[GithubTreeItem]
    truncated: bool = False


class GithubContentItem(BaseModel):
    """GitHub 디렉토리 내용 아이템"""
    name: str
    path: str
    type: str  # file, dir
    size: int = 0
    sha: str
