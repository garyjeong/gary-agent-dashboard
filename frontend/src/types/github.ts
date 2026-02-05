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
