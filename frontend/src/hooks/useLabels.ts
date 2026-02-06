/**
 * 라벨 목록 조회 훅
 */

import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import type { Label } from '@/types';

interface LabelListResponse {
  items: Label[];
}

export function useLabels() {
  const { data, error, isLoading, mutate } = useSWR<LabelListResponse>(
    '/api/labels',
    fetcher,
  );

  return {
    labels: data?.items ?? [],
    isLoading,
    isError: error,
    mutate,
  };
}
