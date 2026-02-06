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
  search?: string;
  label_ids?: number[];
  page?: number;
  limit?: number;
}

export function useIssues(params?: UseIssuesParams) {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set('status', params.status);
  if (params?.priority) searchParams.set('priority', params.priority);
  if (params?.repo_full_name) searchParams.set('repo_full_name', params.repo_full_name);
  if (params?.search) searchParams.set('search', params.search);
  if (params?.label_ids && params.label_ids.length > 0) searchParams.set('label_ids', params.label_ids.join(','));
  if (params?.page !== undefined && params?.limit !== undefined) {
    const skip = (params.page - 1) * params.limit;
    searchParams.set('skip', String(skip));
    searchParams.set('limit', String(params.limit));
  }

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
