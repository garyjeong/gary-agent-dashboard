/**
 * 연결된 GitHub 리포지토리 목록 훅
 */

import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import type { ConnectedRepoListResponse } from '@/types';

export function useRepos() {
  const { data, error, isLoading, mutate } = useSWR<ConnectedRepoListResponse>(
    '/api/github/connected-repos',
    fetcher,
    {
      revalidateOnFocus: false,
    }
  );

  return {
    repos: data?.items ?? [],
    isLoading,
    isError: error,
    mutate,
  };
}
