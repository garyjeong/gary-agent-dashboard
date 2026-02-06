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


class IssueLabelResponse(BaseModel):
    """GitHub 이슈 라벨"""
    name: str
    color: str


class IssueUserResponse(BaseModel):
    """GitHub 이슈 작성자"""
    login: str
    avatar_url: str


class GitHubIssueResponse(BaseModel):
    """GitHub 이슈 응답"""
    number: int
    title: str
    state: str
    html_url: str
    user: IssueUserResponse
    labels: List[IssueLabelResponse]
    body: Optional[str] = None
    created_at: str
    updated_at: str
