/**
 * 인증 상태 훅
 */

import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import type { User } from '@/types';

export function useAuth() {
  const { data, error, isLoading, mutate } = useSWR<User | null>(
    '/api/auth/me',
    fetcher,
    {
      // 에러 시 null 반환 (로그인 안 됨)
      onError: () => null,
      revalidateOnFocus: false,
    }
  );
  
  const login = async () => {
    const res = await fetch('/api/auth/github');
    const data = await res.json();
    window.location.href = data.url;
  };
  
  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    mutate(null);
  };

  const authorizeRepos = async () => {
    const res = await fetch('/api/auth/github/authorize-repos');
    const data = await res.json();
    window.location.href = data.url;
  };

  return {
    user: data,
    isLoading,
    isLoggedIn: !!data,
    hasRepoToken: data?.has_repo_token ?? false,
    login,
    logout,
    authorizeRepos,
    mutate,
  };
}
