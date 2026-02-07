/**
 * 커밋 히스토리 & AI 분석 훅
 */

import { useCallback } from 'react';
import useSWR from 'swr';
import { fetcher, fetcherWithOptions } from '@/lib/fetcher';
import type {
  CommitListResponse,
  BranchListResponse,
  CommitAnalysisResponse,
} from '@/types';

interface UseCommitHistoryParams {
  owner: string | null;
  repo: string | null;
  branch?: string | null;
  repoId?: number | null;
}

export function useCommitHistory({ owner, repo, branch, repoId }: UseCommitHistoryParams) {
  const hasRepo = owner && repo;

  // 브랜치 목록
  const {
    data: branchData,
    isLoading: branchesLoading,
  } = useSWR<BranchListResponse>(
    hasRepo ? `/api/github/repos/${owner}/${repo}/branches` : null,
    fetcher,
    { revalidateOnFocus: false },
  );

  // 커밋 목록
  const branchParam = branch ? `?sha=${encodeURIComponent(branch)}&per_page=30` : '?per_page=30';
  const {
    data: commitData,
    isLoading: commitsLoading,
    mutate: mutateCommits,
  } = useSWR<CommitListResponse>(
    hasRepo ? `/api/github/repos/${owner}/${repo}/commits${branchParam}` : null,
    fetcher,
    { revalidateOnFocus: false },
  );

  // 커밋 분석
  const {
    data: analysis,
    isLoading: analysisLoading,
    mutate: mutateAnalysis,
  } = useSWR<CommitAnalysisResponse>(
    repoId ? `/api/github/connected-repos/${repoId}/commit-analysis` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      refreshInterval: (data) => {
        if (
          data?.commit_analysis_status === 'pending' ||
          data?.commit_analysis_status === 'analyzing'
        ) {
          return 3000;
        }
        return 0;
      },
    },
  );

  // 분석 트리거
  const triggerAnalysis = useCallback(async () => {
    if (!repoId) return;
    try {
      await fetcherWithOptions(
        `/api/github/connected-repos/${repoId}/commit-analysis/trigger`,
        { method: 'POST' },
      );
      await mutateAnalysis();
    } catch {
      // SWR/fetcher가 에러를 처리
    }
  }, [repoId, mutateAnalysis]);

  return {
    commits: commitData?.items ?? [],
    branches: branchData?.items ?? [],
    analysis,
    isLoading: commitsLoading || branchesLoading,
    analysisLoading,
    triggerAnalysis,
    mutateAnalysis,
    mutateCommits,
  };
}
