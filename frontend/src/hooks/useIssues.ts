/**
 * 일감 목록 조회 훅
 */

import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import type { IssueListResponse, IssueStatus, IssuePriority } from '@/types';

interface UseIssuesParams {
  status?: IssueStatus;
  priority?: IssuePriority;
  repo_full_name?: string;
}

export function useIssues(params?: UseIssuesParams) {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set('status', params.status);
  if (params?.priority) searchParams.set('priority', params.priority);
  if (params?.repo_full_name) searchParams.set('repo_full_name', params.repo_full_name);
  
  const query = searchParams.toString();
  const url = query ? `/api/issues?${query}` : '/api/issues';
  
  const { data, error, isLoading, mutate } = useSWR<IssueListResponse>(
    url,
    fetcher,
    {
      // 수동 새로고침 중심으로 동작 (Header에서 Refresh 버튼 사용)
      revalidateOnFocus: true,
    }
  );
  
  return {
    issues: data?.items ?? [],
    total: data?.total ?? 0,
    isLoading,
    isError: error,
    mutate,
  };
}
