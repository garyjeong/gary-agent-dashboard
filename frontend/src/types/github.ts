/**
 * GitHub API 관련 타입
 */

export interface Repo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  html_url: string;
  default_branch: string;
  updated_at: string;
}

export interface RepoListResponse {
  items: Repo[];
}

export interface TreeItem {
  path: string;
  type: 'blob' | 'tree';
  size: number | null;
}

export interface RepoTreeResponse {
  sha: string;
  truncated: boolean;
  tree: TreeItem[];
}

export interface ConnectedRepo {
  id: number;
  github_repo_id: number;
  full_name: string;
  name: string;
  description: string | null;
  language: string | null;
  private: boolean;
  html_url: string;
  default_branch: string;
  stargazers_count: number;
  connected_at: string;
  analysis_status: 'pending' | 'analyzing' | 'completed' | 'failed' | null;
}

export interface ConnectedRepoListResponse {
  items: ConnectedRepo[];
}

export interface RepoAnalysis {
  analysis_status: string;
  analysis_result: string | null;
  analysis_error: string | null;
  analyzed_at: string | null;
}
