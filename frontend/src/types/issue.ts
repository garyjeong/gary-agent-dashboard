/**
 * 일감 관련 타입 정의
 */

export type IssueStatus = 'todo' | 'in_progress' | 'done';
export type IssuePriority = 'low' | 'medium' | 'high';

export interface Label {
  id: number;
  name: string;
  color: string;
}

export interface Issue {
  id: number;
  title: string;
  description: string | null;
  status: IssueStatus;
  priority: IssuePriority;
  repo_full_name: string | null;
  pr_url: string | null;
  pr_status: string | null;
  behavior_example: string | null;
  assignee: string | null;
  due_date: string | null;
  labels: Label[];
  latest_queue_status: string | null;
  created_at: string;
  updated_at: string;
}

export interface IssueCreate {
  title: string;
  description?: string;
  status?: IssueStatus;
  priority?: IssuePriority;
  repo_full_name?: string;
  pr_url?: string;
  behavior_example?: string;
  assignee?: string;
  due_date?: string;
  label_ids?: number[];
}

export interface IssueUpdate {
  title?: string;
  description?: string;
  status?: IssueStatus;
  priority?: IssuePriority;
  repo_full_name?: string;
  pr_url?: string;
  behavior_example?: string;
  assignee?: string;
  due_date?: string;
  label_ids?: number[];
}

export interface IssueListResponse {
  items: Issue[];
  total: number;
}
