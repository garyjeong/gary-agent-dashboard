"""GitHub API 관련 스키마"""
from datetime import datetime
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
    language: Optional[str] = None
    stargazers_count: int = 0


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


# ── 브랜치 / 커밋 스키마 ──────────────────────────────────────

class BranchResponse(BaseModel):
    """브랜치 정보"""
    name: str
    sha: str
    protected: bool = False


class BranchListResponse(BaseModel):
    """브랜치 목록 응답"""
    items: List[BranchResponse]


class CommitAuthorResponse(BaseModel):
    """커밋 작성자"""
    name: str
    email: str
    login: Optional[str] = None
    avatar_url: Optional[str] = None


class CommitStatsResponse(BaseModel):
    """커밋 변경 통계"""
    additions: int = 0
    deletions: int = 0
    total: int = 0


class CommitResponse(BaseModel):
    """커밋 정보"""
    sha: str
    message: str
    author: CommitAuthorResponse
    date: str
    html_url: str
    stats: Optional[CommitStatsResponse] = None
    files_changed: Optional[int] = None


class CommitListResponse(BaseModel):
    """커밋 목록 응답"""
    items: List[CommitResponse]
    repo_full_name: str
    branch: Optional[str] = None


class CommitAnalysisResponse(BaseModel):
    """커밋 히스토리 AI 분석 결과"""
    commit_analysis_status: Optional[str] = None
    commit_analysis_result: Optional[str] = None
    commit_analysis_error: Optional[str] = None
    commit_analyzed_at: Optional[str] = None


class ConnectRepoRequest(BaseModel):
    """리포지토리 연동 요청"""
    github_repo_id: int
    full_name: str
    name: str
    description: Optional[str] = None
    language: Optional[str] = None
    private: bool = False
    html_url: str
    default_branch: str = "main"
    stargazers_count: int = 0


class ConnectedRepoResponse(BaseModel):
    """연동된 리포지토리 응답"""
    id: int
    github_repo_id: int
    full_name: str
    name: str
    description: Optional[str] = None
    language: Optional[str] = None
    private: bool
    html_url: str
    default_branch: str
    stargazers_count: int
    connected_at: str
    analysis_status: Optional[str] = None
    deep_analysis_status: Optional[str] = None
    commit_analysis_status: Optional[str] = None

    model_config = {"from_attributes": True}


class ConnectedRepoListResponse(BaseModel):
    """연동된 리포지토리 목록 응답"""
    items: List[ConnectedRepoResponse]


# ── 심층 분석 스키마 ──────────────────────────────────────

class DeepAnalysisSuggestionResponse(BaseModel):
    """심층 분석 개선 제안 응답"""
    id: int
    category: str
    severity: str
    title: str
    description: str
    affected_files: Optional[str] = None
    suggested_fix: Optional[str] = None
    issue_id: Optional[int] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class DeepAnalysisResponse(BaseModel):
    """심층 분석 결과 응답"""
    deep_analysis_status: Optional[str] = None
    deep_analysis_result: Optional[str] = None
    deep_analysis_error: Optional[str] = None
    deep_analyzed_at: Optional[str] = None
    suggestions: List[DeepAnalysisSuggestionResponse] = []


class CreateIssuesFromSuggestionsRequest(BaseModel):
    """개선 제안 → 이슈 일괄 생성 요청"""
    suggestion_ids: List[int]


class CreateIssuesFromSuggestionsResponse(BaseModel):
    """이슈 일괄 생성 응답"""
    created_count: int
    issue_ids: List[int]
