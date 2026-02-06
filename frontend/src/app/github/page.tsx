'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import { GitBranch, ExternalLink, Star, Lock, Calendar } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { formatRelativeTime } from '@/lib/timeUtils';
import { clsx } from 'clsx';

/**
 * GitHub API 리포지토리 응답 타입
 * API로부터 받아오는 리포지토리 정보
 */
interface GithubRepo {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  html_url: string;
  description: string | null;
  language: string | null;
  default_branch: string;
  updated_at: string | null;
  stargazers_count?: number;
}

/**
 * 언어별 색상 매핑 (GitHub 스타일)
 */
const languageColors: Record<string, string> = {
  TypeScript: '#3178c6',
  JavaScript: '#f1e05a',
  Python: '#3572A5',
  Java: '#b07219',
  Go: '#00ADD8',
  Rust: '#dea584',
  Ruby: '#701516',
  PHP: '#4F5D95',
  C: '#555555',
  'C++': '#f34b7d',
  'C#': '#178600',
  Swift: '#ffac45',
  Kotlin: '#A97BFF',
  Dart: '#00B4AB',
  HTML: '#e34c26',
  CSS: '#563d7c',
};

/**
 * 리포지토리 스켈레톤 카드
 */
function RepoCardSkeleton() {
  return (
    <Card className="p-5 animate-pulse">
      <div className="h-5 bg-gray-200 rounded w-2/3 mb-3" />
      <div className="h-4 bg-gray-100 rounded w-full mb-2" />
      <div className="h-4 bg-gray-100 rounded w-4/5 mb-4" />
      <div className="flex items-center gap-4">
        <div className="h-3 bg-gray-200 rounded w-16" />
        <div className="h-3 bg-gray-200 rounded w-20" />
        <div className="h-3 bg-gray-200 rounded w-24" />
      </div>
    </Card>
  );
}

/**
 * 리포지토리 카드 컴포넌트
 */
function RepoCard({ repo }: { repo: GithubRepo }) {
  const languageColor = repo.language ? languageColors[repo.language] : '#8b949e';

  return (
    <Card
      hover
      className="p-5 transition-all"
      onClick={() => window.open(repo.html_url, '_blank', 'noopener,noreferrer')}
    >
      {/* 상단: 이름 + 공개/비공개 + 외부 링크 */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <h3 className="text-base font-semibold text-gray-900 truncate">
            {repo.name}
          </h3>
          {repo.private && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-medium bg-gray-100 text-gray-600 flex-shrink-0">
              <Lock className="w-3 h-3" />
              Private
            </span>
          )}
        </div>
        <ExternalLink className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
      </div>

      {/* 설명 */}
      <p className="text-sm text-gray-600 mb-4 line-clamp-2 leading-relaxed min-h-[2.5rem]">
        {repo.description || '설명이 없습니다.'}
      </p>

      {/* 하단 메타정보 */}
      <div className="flex items-center gap-4 text-xs text-gray-500">
        {/* 언어 */}
        {repo.language && (
          <div className="flex items-center gap-1.5">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: languageColor }}
            />
            <span>{repo.language}</span>
          </div>
        )}

        {/* 기본 브랜치 */}
        <div className="flex items-center gap-1.5">
          <GitBranch className="w-3.5 h-3.5" />
          <span>{repo.default_branch}</span>
        </div>

        {/* 스타 수 (optional) */}
        {repo.stargazers_count !== undefined && repo.stargazers_count > 0 && (
          <div className="flex items-center gap-1.5">
            <Star className="w-3.5 h-3.5" />
            <span>{repo.stargazers_count}</span>
          </div>
        )}

        {/* 최근 업데이트 */}
        {repo.updated_at && (
          <div className="flex items-center gap-1.5 ml-auto">
            <Calendar className="w-3.5 h-3.5" />
            <span>{formatRelativeTime(repo.updated_at)}</span>
          </div>
        )}
      </div>
    </Card>
  );
}

/**
 * GitHub 연동 페이지
 * 사용자의 리포지토리 목록을 표시합니다.
 */
export default function GitHubPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { data: repos, isLoading, error, mutate } = useSWR<GithubRepo[]>(
    '/api/github/repos',
    fetcher,
    {
      revalidateOnFocus: false,
    }
  );

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          title="GitHub 연동"
          onMenuClick={() => setSidebarOpen(true)}
          onRefresh={() => mutate()}
        />
        <main className="flex-1 overflow-auto p-4 lg:p-6">
          <div className="max-w-7xl mx-auto">
            {/* 헤더 섹션 */}
            <div className="mb-6">
              <h1 className="text-xl font-semibold text-gray-900 mb-1">
                리포지토리 목록
              </h1>
              <p className="text-sm text-gray-500">
                연결된 GitHub 계정의 리포지토리를 확인하세요.
              </p>
            </div>

            {/* 로딩 상태 */}
            {isLoading && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <RepoCardSkeleton key={i} />
                ))}
              </div>
            )}

            {/* 에러 상태 */}
            {error && !isLoading && (
              <Card className="p-8 text-center">
                <div className="text-red-500 mb-2">
                  <svg
                    className="w-12 h-12 mx-auto"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <h3 className="text-base font-medium text-gray-900 mb-1">
                  리포지토리를 불러올 수 없습니다
                </h3>
                <p className="text-sm text-gray-500">
                  {error.message || '다시 시도해주세요.'}
                </p>
              </Card>
            )}

            {/* 빈 상태 */}
            {!isLoading && !error && repos && repos.length === 0 && (
              <Card className="p-12 text-center">
                <div className="text-gray-400 mb-3">
                  <GitBranch className="w-16 h-16 mx-auto" />
                </div>
                <h3 className="text-base font-medium text-gray-900 mb-1">
                  연결된 리포지토리가 없습니다
                </h3>
                <p className="text-sm text-gray-500">
                  GitHub에 리포지토리를 생성하거나 접근 권한을 확인해주세요.
                </p>
              </Card>
            )}

            {/* 리포지토리 그리드 */}
            {!isLoading && repos && repos.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {repos.map((repo) => (
                  <RepoCard key={repo.id} repo={repo} />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
