'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import { GitBranch, ExternalLink, Star, Lock, Calendar, X, Download, CircleDot, Loader2 } from 'lucide-react';
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
 * GitHub 이슈 타입
 */
interface GitHubIssueLabel {
  name: string;
  color: string;
}

interface GitHubIssue {
  number: number;
  title: string;
  state: string;
  html_url: string;
  user: {
    login: string;
    avatar_url: string;
  };
  labels: GitHubIssueLabel[];
  body: string | null;
  created_at: string;
  updated_at: string;
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
function RepoCard({
  repo,
  isSelected,
  onSelect,
}: {
  repo: GithubRepo;
  isSelected: boolean;
  onSelect: (fullName: string) => void;
}) {
  const languageColor = repo.language ? languageColors[repo.language] : '#8b949e';

  return (
    <Card
      hover
      className={clsx(
        'p-5 transition-all',
        isSelected && 'ring-2 ring-primary-500 border-primary-500'
      )}
      onClick={() => onSelect(repo.full_name)}
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
        <a
          href={repo.html_url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-gray-400 hover:text-gray-600 flex-shrink-0 mt-0.5"
        >
          <ExternalLink className="w-4 h-4" />
        </a>
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
 * GitHub 이슈 목록 패널
 */
function IssueListPanel({
  repoFullName,
  onClose,
}: {
  repoFullName: string;
  onClose: () => void;
}) {
  const [importingIssue, setImportingIssue] = useState<number | null>(null);
  const [importedIssues, setImportedIssues] = useState<Set<number>>(new Set());

  const [owner, repo] = repoFullName.split('/');
  const { data: issues, isLoading, error } = useSWR<GitHubIssue[]>(
    `/api/github/repos/${owner}/${repo}/issues`,
    fetcher,
    { revalidateOnFocus: false }
  );

  const importIssue = async (issueNumber: number) => {
    setImportingIssue(issueNumber);
    try {
      const res = await fetch(
        `/api/github/repos/${owner}/${repo}/issues/${issueNumber}/import`,
        { method: 'POST' }
      );
      if (res.ok) {
        setImportedIssues((prev) => new Set(prev).add(issueNumber));
      } else {
        const data = await res.json().catch(() => ({ detail: '가져오기 실패' }));
        alert(data.detail || '가져오기 실패');
      }
    } catch {
      alert('네트워크 오류가 발생했습니다');
    } finally {
      setImportingIssue(null);
    }
  };

  return (
    <Card className="mt-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <CircleDot className="w-4 h-4 text-green-600" />
          <h3 className="text-sm font-semibold text-gray-800">
            {repoFullName} 이슈
          </h3>
          {issues && (
            <span className="text-xs text-gray-400">
              ({issues.length}건)
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 로딩 */}
      {isLoading && (
        <div className="flex items-center justify-center py-8 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          <span className="text-sm">이슈를 불러오는 중...</span>
        </div>
      )}

      {/* 에러 */}
      {error && !isLoading && (
        <div className="px-5 py-6 text-center">
          <p className="text-sm text-red-500">
            이슈를 불러올 수 없습니다.
          </p>
        </div>
      )}

      {/* 빈 상태 */}
      {!isLoading && !error && issues && issues.length === 0 && (
        <div className="px-5 py-8 text-center">
          <p className="text-sm text-gray-500">
            열린 이슈가 없습니다.
          </p>
        </div>
      )}

      {/* 이슈 목록 */}
      {!isLoading && issues && issues.length > 0 && (
        <div className="divide-y divide-gray-100">
          {issues.map((issue) => (
            <div
              key={issue.number}
              className="flex items-center justify-between py-2.5 px-5 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <CircleDot className={clsx(
                  'w-3.5 h-3.5 flex-shrink-0',
                  issue.state === 'open' ? 'text-green-600' : 'text-purple-600'
                )} />
                <span className="text-xs text-gray-400 flex-shrink-0">
                  #{issue.number}
                </span>
                <a
                  href={issue.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-gray-800 hover:text-primary-600 truncate"
                  onClick={(e) => e.stopPropagation()}
                >
                  {issue.title}
                </a>
                {issue.labels.map((l) => (
                  <span
                    key={l.name}
                    className="text-2xs px-1.5 py-0.5 rounded flex-shrink-0"
                    style={{
                      backgroundColor: `#${l.color}20`,
                      color: `#${l.color}`,
                    }}
                  >
                    {l.name}
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                <span className="text-2xs text-gray-400">
                  {formatRelativeTime(issue.updated_at)}
                </span>
                {importedIssues.has(issue.number) ? (
                  <span className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded">
                    가져옴
                  </span>
                ) : (
                  <button
                    onClick={() => importIssue(issue.number)}
                    disabled={importingIssue === issue.number}
                    className={clsx(
                      'inline-flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors',
                      importingIssue === issue.number
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-primary-600 text-white hover:bg-primary-700'
                    )}
                  >
                    {importingIssue === issue.number ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Download className="w-3 h-3" />
                    )}
                    가져오기
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

/**
 * GitHub 연동 페이지
 * 사용자의 리포지토리 목록을 표시합니다.
 */
export default function GitHubPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null);
  const { data: repos, isLoading, error, mutate } = useSWR<GithubRepo[]>(
    '/api/github/repos',
    fetcher,
    {
      revalidateOnFocus: false,
    }
  );

  const handleRepoSelect = (fullName: string) => {
    setSelectedRepo((prev) => (prev === fullName ? null : fullName));
  };

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
                리포지토리를 클릭하면 이슈 목록을 확인하고 대시보드로 가져올 수 있습니다.
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
                  <RepoCard
                    key={repo.id}
                    repo={repo}
                    isSelected={selectedRepo === repo.full_name}
                    onSelect={handleRepoSelect}
                  />
                ))}
              </div>
            )}

            {/* 이슈 목록 패널 */}
            {selectedRepo && (
              <IssueListPanel
                repoFullName={selectedRepo}
                onClose={() => setSelectedRepo(null)}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
