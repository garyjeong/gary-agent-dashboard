/**
 * GitHub 리포지토리 목록 훅
 */

import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import type { RepoListResponse } from '@/types';

export function useRepos() {
  const { data, error, isLoading, mutate } = useSWR<RepoListResponse>(
    '/api/github/repos',
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
