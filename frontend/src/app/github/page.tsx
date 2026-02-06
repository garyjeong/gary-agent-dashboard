'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import { useAuth } from '@/hooks';
import {
  GitBranch, ExternalLink, Star, Lock,
  X, Download, CircleDot, Loader2, Settings, Link2, Check,
  Clock, AlertTriangle, RefreshCw, FileText, CheckCircle2,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { formatRelativeTime } from '@/lib/timeUtils';
import { clsx } from 'clsx';
import type { ConnectedRepo, ConnectedRepoListResponse, RepoAnalysis } from '@/types';

/* ── 타입 ─────────────────────────────────────────── */

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

interface RepoListResponse {
  items: GithubRepo[];
}

interface GitHubIssueLabel {
  name: string;
  color: string;
}

interface GitHubIssue {
  number: number;
  title: string;
  state: string;
  html_url: string;
  user: { login: string; avatar_url: string };
  labels: GitHubIssueLabel[];
  body: string | null;
  created_at: string;
  updated_at: string;
}

/* ── 언어 색상 ──────────────────────────────────────── */

const languageColors: Record<string, string> = {
  TypeScript: '#3178c6', JavaScript: '#f1e05a', Python: '#3572A5',
  Java: '#b07219', Go: '#00ADD8', Rust: '#dea584', Ruby: '#701516',
  PHP: '#4F5D95', C: '#555555', 'C++': '#f34b7d', 'C#': '#178600',
  Swift: '#ffac45', Kotlin: '#A97BFF', Dart: '#00B4AB',
  HTML: '#e34c26', CSS: '#563d7c',
};

/* ── 분석 상태 배지 ────────────────────────────────── */

function AnalysisStatusBadge({
  status,
  repoId,
  onRetry,
  onViewResult,
}: {
  status: ConnectedRepo['analysis_status'];
  repoId: number;
  onRetry: (repoId: number) => void;
  onViewResult: (repoId: number) => void;
}) {
  if (!status) return null;

  switch (status) {
    case 'pending':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-medium bg-gray-100 text-gray-500">
          <Clock className="w-3 h-3" />
          분석 대기중
        </span>
      );
    case 'analyzing':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-medium bg-blue-50 text-blue-600">
          <Loader2 className="w-3 h-3 animate-spin" />
          분석 중...
        </span>
      );
    case 'completed':
      return (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onViewResult(repoId);
          }}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-medium bg-green-50 text-green-700 hover:bg-green-100 transition-colors"
        >
          <CheckCircle2 className="w-3 h-3" />
          분석 완료
        </button>
      );
    case 'failed':
      return (
        <div className="inline-flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-medium bg-red-50 text-red-600">
            <AlertTriangle className="w-3 h-3" />
            분석 실패
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRetry(repoId);
            }}
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-2xs text-gray-500 hover:text-primary-600 hover:bg-gray-100 transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            재시도
          </button>
        </div>
      );
    default:
      return null;
  }
}

/* ── 분석 결과 모달 ────────────────────────────────── */

function AnalysisModal({
  repoId,
  repoName,
  open,
  onClose,
}: {
  repoId: number | null;
  repoName: string;
  open: boolean;
  onClose: () => void;
}) {
  const { data, isLoading, error } = useSWR<RepoAnalysis>(
    repoId && open ? `/api/github/connected-repos/${repoId}/analysis` : null,
    fetcher,
  );

  return (
    <Modal open={open} onClose={onClose} title={`${repoName} 프로젝트 분석`} size="lg">
      <div className="max-h-[70vh] overflow-y-auto">
        {isLoading && (
          <div className="flex items-center justify-center py-12 text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            <span className="text-sm">분석 결과를 불러오는 중...</span>
          </div>
        )}
        {error && !isLoading && (
          <div className="py-8 text-center">
            <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-2" />
            <p className="text-sm text-red-500">분석 결과를 불러올 수 없습니다.</p>
          </div>
        )}
        {data && !isLoading && (
          <div>
            {data.analysis_result ? (
              <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap leading-relaxed">
                {data.analysis_result}
              </div>
            ) : data.analysis_error ? (
              <div className="py-6 text-center">
                <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-2" />
                <p className="text-sm text-red-500 mb-1">분석 중 오류가 발생했습니다</p>
                <p className="text-xs text-gray-400">{data.analysis_error}</p>
              </div>
            ) : (
              <p className="text-sm text-gray-500 py-6 text-center">분석 결과가 없습니다.</p>
            )}
            {data.analyzed_at && (
              <div className="mt-4 pt-3 border-t border-gray-100 text-xs text-gray-400 text-right">
                분석 완료: {new Date(data.analyzed_at).toLocaleString('ko-KR')}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

/* ── 탭 타입 ──────────────────────────────────────── */

type Tab = 'settings' | 'connected';

/* ── 리포지토리 설정 탭 ─────────────────────────────── */

function RepoSettingsTab({
  repos,
  isLoading,
  error,
  connectedIds,
  onToggle,
  togglingId,
}: {
  repos: GithubRepo[] | undefined;
  isLoading: boolean;
  error: unknown;
  connectedIds: Set<number>;
  onToggle: (repo: GithubRepo) => void;
  togglingId: number | null;
}) {
  const [search, setSearch] = useState('');

  const filtered = repos?.filter(
    (r) =>
      r.full_name.toLowerCase().includes(search.toLowerCase()) ||
      (r.description ?? '').toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div>
      {/* 검색 */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="리포지토리 검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-md px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
      </div>

      {/* 로딩 */}
      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="animate-pulse bg-white rounded-lg border border-gray-200 p-4 flex items-center gap-4">
              <div className="h-5 bg-gray-200 rounded w-48" />
              <div className="h-4 bg-gray-100 rounded w-64 flex-1" />
              <div className="h-8 bg-gray-200 rounded w-20" />
            </div>
          ))}
        </div>
      )}

      {/* 에러 */}
      {error && !isLoading && (
        <Card className="p-8 text-center">
          <p className="text-sm text-red-500">리포지토리를 불러올 수 없습니다.</p>
        </Card>
      )}

      {/* 빈 상태 */}
      {!isLoading && !error && filtered && filtered.length === 0 && (
        <Card className="p-8 text-center">
          <p className="text-sm text-gray-500">
            {search ? '검색 결과가 없습니다.' : '리포지토리가 없습니다.'}
          </p>
        </Card>
      )}

      {/* 리포지토리 리스트 */}
      {!isLoading && filtered && filtered.length > 0 && (
        <Card>
          <div className="divide-y divide-gray-100">
            {filtered.map((repo) => {
              const isConnected = connectedIds.has(repo.id);
              const isToggling = togglingId === repo.id;
              const langColor = repo.language ? languageColors[repo.language] : '#8b949e';

              return (
                <div
                  key={repo.id}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors"
                >
                  {/* 왼쪽: 리포 정보 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <a
                        href={repo.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-gray-900 hover:text-primary-600 truncate"
                      >
                        {repo.full_name}
                      </a>
                      {repo.private && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-500 flex-shrink-0">
                          <Lock className="w-2.5 h-2.5" />
                          Private
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      {repo.language && (
                        <span className="flex items-center gap-1">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: langColor }} />
                          {repo.language}
                        </span>
                      )}
                      {repo.stargazers_count !== undefined && repo.stargazers_count > 0 && (
                        <span className="flex items-center gap-1">
                          <Star className="w-3 h-3" />
                          {repo.stargazers_count}
                        </span>
                      )}
                      {repo.updated_at && (
                        <span>{formatRelativeTime(repo.updated_at)}</span>
                      )}
                    </div>
                  </div>

                  {/* 오른쪽: 연동 토글 */}
                  <button
                    onClick={() => onToggle(repo)}
                    disabled={isToggling}
                    className={clsx(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                      isToggling && 'opacity-50 cursor-not-allowed',
                      isConnected
                        ? 'bg-green-50 text-green-700 hover:bg-red-50 hover:text-red-600'
                        : 'bg-gray-100 text-gray-600 hover:bg-primary-50 hover:text-primary-600',
                    )}
                  >
                    {isToggling ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : isConnected ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      <Link2 className="w-3.5 h-3.5" />
                    )}
                    {isConnected ? '연동됨' : '연동'}
                  </button>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}

/* ── 연동된 리포지토리 탭 ──────────────────────────── */

function ConnectedReposTab({
  connectedRepos,
  isLoading,
  onRetryAnalysis,
}: {
  connectedRepos: ConnectedRepo[] | undefined;
  isLoading: boolean;
  onRetryAnalysis: (repoId: number) => void;
}) {
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null);
  const [analysisModal, setAnalysisModal] = useState<{ repoId: number; name: string } | null>(null);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="p-5 animate-pulse">
            <div className="h-5 bg-gray-200 rounded w-2/3 mb-3" />
            <div className="h-4 bg-gray-100 rounded w-full mb-2" />
            <div className="h-4 bg-gray-100 rounded w-4/5 mb-4" />
            <div className="flex items-center gap-4">
              <div className="h-3 bg-gray-200 rounded w-16" />
              <div className="h-3 bg-gray-200 rounded w-20" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (!connectedRepos || connectedRepos.length === 0) {
    return (
      <Card className="p-12 text-center">
        <div className="text-gray-400 mb-3">
          <Link2 className="w-12 h-12 mx-auto" />
        </div>
        <h3 className="text-base font-medium text-gray-900 mb-1">
          연동된 리포지토리가 없습니다
        </h3>
        <p className="text-sm text-gray-500">
          리포지토리 설정 탭에서 연동할 리포지토리를 선택하세요.
        </p>
      </Card>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {connectedRepos.map((repo) => {
          const langColor = repo.language ? languageColors[repo.language] : '#8b949e';
          const isSelected = selectedRepo === repo.full_name;

          return (
            <Card
              key={repo.id}
              hover
              className={clsx(
                'p-5 transition-all',
                isSelected && 'ring-2 ring-primary-500 border-primary-500',
              )}
              onClick={() => setSelectedRepo(isSelected ? null : repo.full_name)}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
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
              {/* 분석 상태 배지 */}
              <div className="mb-3">
                <AnalysisStatusBadge
                  status={repo.analysis_status}
                  repoId={repo.id}
                  onRetry={onRetryAnalysis}
                  onViewResult={(id) => setAnalysisModal({ repoId: id, name: repo.name })}
                />
              </div>
              <p className="text-sm text-gray-600 mb-4 line-clamp-2 leading-relaxed min-h-[2.5rem]">
                {repo.description || '설명이 없습니다.'}
              </p>
              <div className="flex items-center gap-4 text-xs text-gray-500">
                {repo.language && (
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: langColor }} />
                    <span>{repo.language}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <GitBranch className="w-3.5 h-3.5" />
                  <span>{repo.default_branch}</span>
                </div>
                {repo.stargazers_count > 0 && (
                  <div className="flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5" />
                    <span>{repo.stargazers_count}</span>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* 이슈 목록 패널 */}
      {selectedRepo && (
        <IssueListPanel
          repoFullName={selectedRepo}
          onClose={() => setSelectedRepo(null)}
        />
      )}

      {/* 분석 결과 모달 */}
      <AnalysisModal
        repoId={analysisModal?.repoId ?? null}
        repoName={analysisModal?.name ?? ''}
        open={!!analysisModal}
        onClose={() => setAnalysisModal(null)}
      />
    </div>
  );
}

/* ── 이슈 목록 패널 ─────────────────────────────────── */

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
    { revalidateOnFocus: false },
  );

  const importIssue = async (issueNumber: number) => {
    setImportingIssue(issueNumber);
    try {
      const res = await fetch(
        `/api/github/repos/${owner}/${repo}/issues/${issueNumber}/import`,
        { method: 'POST' },
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
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <CircleDot className="w-4 h-4 text-green-600" />
          <h3 className="text-sm font-semibold text-gray-800">{repoFullName} 이슈</h3>
          {issues && <span className="text-xs text-gray-400">({issues.length}건)</span>}
        </div>
        <button
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-8 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          <span className="text-sm">이슈를 불러오는 중...</span>
        </div>
      )}

      {error && !isLoading && (
        <div className="px-5 py-6 text-center">
          <p className="text-sm text-red-500">이슈를 불러올 수 없습니다.</p>
        </div>
      )}

      {!isLoading && !error && issues && issues.length === 0 && (
        <div className="px-5 py-8 text-center">
          <p className="text-sm text-gray-500">열린 이슈가 없습니다.</p>
        </div>
      )}

      {!isLoading && issues && issues.length > 0 && (
        <div className="divide-y divide-gray-100">
          {issues.map((issue) => (
            <div
              key={issue.number}
              className="flex items-center justify-between py-2.5 px-5 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <CircleDot
                  className={clsx(
                    'w-3.5 h-3.5 flex-shrink-0',
                    issue.state === 'open' ? 'text-green-600' : 'text-purple-600',
                  )}
                />
                <span className="text-xs text-gray-400 flex-shrink-0">#{issue.number}</span>
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
                    style={{ backgroundColor: `#${l.color}20`, color: `#${l.color}` }}
                  >
                    {l.name}
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                <span className="text-2xs text-gray-400">{formatRelativeTime(issue.updated_at)}</span>
                {importedIssues.has(issue.number) ? (
                  <span className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded">가져옴</span>
                ) : (
                  <button
                    onClick={() => importIssue(issue.number)}
                    disabled={importingIssue === issue.number}
                    className={clsx(
                      'inline-flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors',
                      importingIssue === issue.number
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-primary-600 text-white hover:bg-primary-700',
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

/* ── 메인 페이지 ─────────────────────────────────────── */

export default function GitHubPage() {
  const router = useRouter();
  const { isLoggedIn, isLoading: authLoading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('connected');
  const [togglingId, setTogglingId] = useState<number | null>(null);

  // GitHub 전체 리포지토리
  const {
    data: repoData,
    isLoading: reposLoading,
    error: reposError,
    mutate: mutateRepos,
  } = useSWR<RepoListResponse>(
    isLoggedIn ? '/api/github/repos' : null,
    fetcher,
    { revalidateOnFocus: false },
  );

  // 연동된 리포지토리
  const {
    data: connectedData,
    isLoading: connectedLoading,
    mutate: mutateConnected,
  } = useSWR<ConnectedRepoListResponse>(
    isLoggedIn ? '/api/github/connected-repos' : null,
    fetcher,
    { revalidateOnFocus: false },
  );

  const repos = repoData?.items;
  const connectedRepos = connectedData?.items;
  const connectedIds = new Set(connectedRepos?.map((r) => r.github_repo_id) ?? []);

  // 분석 진행 중인 리포가 있으면 3초마다 폴링
  const hasAnalyzing = useMemo(
    () => connectedRepos?.some((r) => r.analysis_status === 'pending' || r.analysis_status === 'analyzing') ?? false,
    [connectedRepos],
  );

  useSWR(
    hasAnalyzing ? '/api/github/connected-repos' : null,
    fetcher,
    { refreshInterval: 3000, onSuccess: (data: ConnectedRepoListResponse) => mutateConnected(data, false) },
  );

  useEffect(() => {
    if (!authLoading && !isLoggedIn) {
      router.push('/login');
    }
  }, [isLoggedIn, authLoading, router]);

  const handleRetryAnalysis = useCallback(
    async (repoId: number) => {
      try {
        const res = await fetch(`/api/github/connected-repos/${repoId}/analysis/retry`, {
          method: 'POST',
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({ detail: '재시도 실패' }));
          alert(data.detail || '재시도 실패');
          return;
        }
        await mutateConnected();
      } catch {
        alert('네트워크 오류가 발생했습니다');
      }
    },
    [mutateConnected],
  );

  const handleToggle = useCallback(
    async (repo: GithubRepo) => {
      const isConnected = connectedIds.has(repo.id);
      setTogglingId(repo.id);
      try {
        if (isConnected) {
          await fetch(`/api/github/connected-repos/${repo.id}`, { method: 'DELETE' });
        } else {
          await fetch('/api/github/connected-repos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              github_repo_id: repo.id,
              full_name: repo.full_name,
              name: repo.name,
              description: repo.description,
              language: repo.language,
              private: repo.private,
              html_url: repo.html_url,
              default_branch: repo.default_branch,
              stargazers_count: repo.stargazers_count ?? 0,
            }),
          });
        }
        await mutateConnected();
      } catch {
        alert('연동 처리 중 오류가 발생했습니다.');
      } finally {
        setTogglingId(null);
      }
    },
    [connectedIds, mutateConnected],
  );

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-primary-600" />
      </div>
    );
  }

  const tabs: { key: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    {
      key: 'connected',
      label: '연동된 리포지토리',
      icon: <Link2 className="w-4 h-4" />,
      count: connectedRepos?.length,
    },
    {
      key: 'settings',
      label: '리포지토리 설정',
      icon: <Settings className="w-4 h-4" />,
      count: repos?.length,
    },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          title="GitHub 연동"
          onMenuClick={() => setSidebarOpen(true)}
          onRefresh={() => {
            mutateRepos();
            mutateConnected();
          }}
        />
        <main className="flex-1 overflow-auto p-4 lg:p-6">
          <div className="max-w-7xl mx-auto">
            {/* 탭 네비게이션 */}
            <div className="flex items-center gap-1 mb-6 border-b border-gray-200">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={clsx(
                    'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px',
                    activeTab === tab.key
                      ? 'border-primary-600 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700',
                  )}
                >
                  {tab.icon}
                  {tab.label}
                  {tab.count !== undefined && (
                    <span
                      className={clsx(
                        'text-xs px-1.5 py-0.5 rounded-full',
                        activeTab === tab.key
                          ? 'bg-primary-50 text-primary-600'
                          : 'bg-gray-100 text-gray-500',
                      )}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* 탭 컨텐츠 */}
            {activeTab === 'settings' && (
              <RepoSettingsTab
                repos={repos}
                isLoading={reposLoading}
                error={reposError}
                connectedIds={connectedIds}
                onToggle={handleToggle}
                togglingId={togglingId}
              />
            )}

            {activeTab === 'connected' && (
              <ConnectedReposTab
                connectedRepos={connectedRepos}
                isLoading={connectedLoading}
                onRetryAnalysis={handleRetryAnalysis}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
