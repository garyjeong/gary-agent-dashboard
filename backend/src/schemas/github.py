"""GitHub API 관련 스키마"""
from typing import Optional, List
from pydantic import BaseModel


class RepoResponse(BaseModel):
    """리포지토리 정보"""
    id: int
    name: str
    full_name: str
    description: Optional[str]
    private: bool
    html_url: str
    default_branch: str
    updated_at: str


class RepoListResponse(BaseModel):
    """리포지토리 목록 응답"""
    items: List[RepoResponse]


class TreeItemResponse(BaseModel):
    """트리 아이템"""
    path: str
    type: str  # blob, tree
    size: Optional[int] = None


class RepoTreeResponse(BaseModel):
    """리포지토리 트리 응답"""
    sha: str
    truncated: bool
    tree: List[TreeItemResponse]
