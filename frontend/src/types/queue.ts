/**
 * 작업 큐 관련 타입 정의
 */

import { Issue } from './issue';

export type QueueStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

export interface QueueItem {
  id: number;
  issue_id: number;
  status: QueueStatus;
  priority: number;
  result: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export interface QueueItemWithIssue extends QueueItem {
  issue: Issue;
}

export interface QueueItemUpdate {
  status: QueueStatus;
  result?: string;
}
