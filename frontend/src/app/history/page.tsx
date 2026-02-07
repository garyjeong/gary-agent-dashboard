'use client';

import { useState, useMemo, useCallback } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { useAuth, useRepos, useCommitHistory } from '@/hooks';
import { Card } from '@/components/ui/Card';
import { formatRelativeTime } from '@/lib/timeUtils';
import { clsx } from 'clsx';
import ReactMarkdown from 'react-markdown';
import {
  Loader2, GitCommit, ChevronDown, Sparkles,
  AlertTriangle, RefreshCw, ExternalLink,
} from 'lucide-react';
import type { ConnectedRepo, CommitAnalysisResponse } from '@/types';

export default function HistoryPage() {
  const { isLoggedIn, isLoading: authLoading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // 리포지토리 선택
  const { repos, isLoading: reposLoading } = useRepos();
  const [selectedRepoId, setSelectedRepoId] = useState<number | null>(null);

  // 선택된 리포 정보
  const selectedRepo: ConnectedRepo | undefined = useMemo(
    () => repos.find((r) => r.id === selectedRepoId),
    [repos, selectedRepoId],
  );

  // 자동 선택: 리포가 로드되면 첫 번째 리포 선택
  useMemo(() => {
    if (repos.length > 0 && !selectedRepoId) {
      setSelectedRepoId(repos[0].id);
    }
  }, [repos, selectedRepoId]);

  // owner/repo 파싱
  const [owner, repoName] = useMemo(() => {
    if (!selectedRepo) return [null, null];
    const parts = selectedRepo.full_name.split('/');
    return [parts[0], parts[1]];
  }, [selectedRepo]);

  // 브랜치 선택
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);

  // 리포 변경 시 브랜치 초기화
  const handleRepoChange = useCallback((repoId: number) => {
    setSelectedRepoId(repoId);
    setSelectedBranch(null);
  }, []);

  // 커밋 히스토리 훅
  const {
    commits,
    branches,
    analysis,
    isLoading: historyLoading,
    analysisLoading,
    triggerAnalysis,
    mutateCommits,
    mutateAnalysis,
  } = useCommitHistory({
    owner,
    repo: repoName,
    branch: selectedBranch,
    repoId: selectedRepoId,
  });

  // 브랜치가 로드되면 default_branch 선택
  useMemo(() => {
    if (branches.length > 0 && !selectedBranch && selectedRepo) {
      const defaultBr = branches.find((b) => b.name === selectedRepo.default_branch);
      setSelectedBranch(defaultBr?.name ?? branches[0].name);
    }
  }, [branches, selectedBranch, selectedRepo]);

  const handleRefresh = useCallback(() => {
    mutateCommits();
    mutateAnalysis();
  }, [mutateCommits, mutateAnalysis]);

  const isAnalyzing =
    analysis?.commit_analysis_status === 'pending' ||
    analysis?.commit_analysis_status === 'analyzing';

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-primary-600" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          title="히스토리"
          onMenuClick={() => setSidebarOpen(true)}
          onRefresh={handleRefresh}
        />
        <main className="flex-1 overflow-auto p-4 lg:p-6">
          <div className="max-w-7xl mx-auto">
            {/* 필터 바 */}
            <div className="flex flex-wrap items-center gap-3 mb-5">
              {/* 리포지토리 선택 */}
              <div className="relative">
                <select
                  value={selectedRepoId ?? ''}
                  onChange={(e) => handleRepoChange(Number(e.target.value))}
                  disabled={reposLoading || repos.length === 0}
                  className="appearance-none bg-white border border-gray-200 rounded-lg px-3 py-2 pr-8 text-sm font-medium text-gray-700 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors disabled:opacity-50 min-w-[180px]"
                >
                  {repos.length === 0 && (
                    <option value="">리포지토리 없음</option>
                  )}
                  {repos.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.full_name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              </div>

              {/* 브랜치 선택 */}
              <div className="relative">
                <select
                  value={selectedBranch ?? ''}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  disabled={branches.length === 0}
                  className="appearance-none bg-white border border-gray-200 rounded-lg px-3 py-2 pr-8 text-sm font-medium text-gray-700 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors disabled:opacity-50 min-w-[140px]"
                >
                  {branches.length === 0 && (
                    <option value="">브랜치 없음</option>
                  )}
                  {branches.map((b) => (
                    <option key={b.name} value={b.name}>
                      {b.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              </div>

              {/* AI 분석 요청 버튼 */}
              <button
                onClick={triggerAnalysis}
                disabled={!selectedRepoId || isAnalyzing}
                className={clsx(
                  'inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                  isAnalyzing
                    ? 'bg-purple-50 text-purple-600 cursor-not-allowed'
                    : 'bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed',
                )}
              >
                {isAnalyzing ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                {isAnalyzing ? 'AI 분석 중...' : 'AI 분석 요청'}
              </button>
            </div>

            {/* 빈 리포 상태 */}
            {repos.length === 0 && !reposLoading && (
              <Card className="p-12 text-center">
                <GitCommit className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <h3 className="text-base font-medium text-gray-900 mb-1">
                  연동된 리포지토리가 없습니다
                </h3>
                <p className="text-sm text-gray-500">
                  GitHub 연동 페이지에서 리포지토리를 연결해주세요.
                </p>
              </Card>
            )}

            {/* 메인 컨텐츠: 커밋 목록 + AI 분석 */}
            {selectedRepo && (
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
                {/* 좌측: 커밋 목록 (3/5) */}
                <div className="lg:col-span-3">
                  <Card>
                    <div className="px-4 py-3 border-b border-gray-100">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-gray-900">
                          최근 커밋
                        </h3>
                        <span className="text-xs text-gray-400">
                          {commits.length}개
                        </span>
                      </div>
                    </div>

                    {/* 로딩 */}
                    {historyLoading && (
                      <div className="flex items-center justify-center py-12 text-gray-400">
                        <Loader2 className="w-5 h-5 animate-spin mr-2" />
                        <span className="text-sm">커밋을 불러오는 중...</span>
                      </div>
                    )}

                    {/* 빈 상태 */}
                    {!historyLoading && commits.length === 0 && (
                      <div className="py-12 text-center">
                        <GitCommit className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">커밋이 없습니다.</p>
                      </div>
                    )}

                    {/* 커밋 리스트 */}
                    {!historyLoading && commits.length > 0 && (
                      <div className="divide-y divide-gray-50">
                        {commits.map((commit) => {
                          const firstLine = commit.message.split('\n')[0];
                          return (
                            <div
                              key={commit.sha}
                              className="px-4 py-3 hover:bg-gray-50 transition-colors group"
                            >
                              <div className="flex items-start gap-3">
                                {/* 커밋 아이콘 */}
                                <div className="mt-0.5 flex-shrink-0">
                                  <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
                                    <GitCommit className="w-3 h-3 text-gray-500" />
                                  </div>
                                </div>

                                {/* 커밋 내용 */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-0.5">
                                    <code className="text-xs font-mono text-primary-600 bg-primary-50 px-1.5 py-0.5 rounded flex-shrink-0">
                                      {commit.sha.slice(0, 7)}
                                    </code>
                                    <a
                                      href={commit.html_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                      <ExternalLink className="w-3 h-3 text-gray-400 hover:text-primary-600" />
                                    </a>
                                  </div>
                                  <p className="text-sm text-gray-900 truncate leading-relaxed">
                                    {firstLine}
                                  </p>
                                  <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                                    {commit.author.avatar_url && (
                                      <img
                                        src={commit.author.avatar_url}
                                        alt={commit.author.name}
                                        className="w-4 h-4 rounded-full"
                                      />
                                    )}
                                    <span className="font-medium text-gray-500">
                                      {commit.author.login || commit.author.name}
                                    </span>
                                    <span>·</span>
                                    <span>{formatRelativeTime(commit.date)}</span>
                                    {commit.stats && (
                                      <>
                                        <span>·</span>
                                        <span className="text-green-600">
                                          +{commit.stats.additions}
                                        </span>
                                        <span className="text-red-500">
                                          -{commit.stats.deletions}
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </Card>
                </div>

                {/* 우측: AI 분석 결과 (2/5) */}
                <div className="lg:col-span-2">
                  <Card>
                    <div className="px-4 py-3 border-b border-gray-100">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-purple-500" />
                        <h3 className="text-sm font-semibold text-gray-900">
                          AI 분석 결과
                        </h3>
                      </div>
                    </div>

                    <div className="p-4">
                      <AnalysisPanel
                        analysis={analysis}
                        isLoading={analysisLoading}
                        onTrigger={triggerAnalysis}
                        repoId={selectedRepoId}
                      />
                    </div>
                  </Card>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

/* ── AI 분석 패널 ───────────────────────────────────── */

function AnalysisPanel({
  analysis,
  isLoading,
  onTrigger,
  repoId,
}: {
  analysis: CommitAnalysisResponse | undefined;
  isLoading: boolean;
  onTrigger: () => void;
  repoId: number | null;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-400">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        <span className="text-sm">불러오는 중...</span>
      </div>
    );
  }

  const status = analysis?.commit_analysis_status;

  // 분석 미요청
  if (!status) {
    return (
      <div className="py-8 text-center">
        <Sparkles className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="text-sm text-gray-500 mb-4">
          커밋 히스토리를 AI가 분석해드립니다.
          <br />
          상단의 &ldquo;AI 분석 요청&rdquo; 버튼을 클릭하세요.
        </p>
        <button
          onClick={onTrigger}
          disabled={!repoId}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-primary-600 text-white hover:bg-primary-700 transition-colors disabled:opacity-50"
        >
          <Sparkles className="w-3.5 h-3.5" />
          분석 시작
        </button>
      </div>
    );
  }

  // 대기 중
  if (status === 'pending') {
    return (
      <div className="flex items-center justify-center py-12 text-gray-400">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        <span className="text-sm">분석 대기 중...</span>
      </div>
    );
  }

  // 분석 중
  if (status === 'analyzing') {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-purple-500">
        <Loader2 className="w-6 h-6 animate-spin mb-3" />
        <span className="text-sm font-medium">AI가 커밋을 분석하고 있습니다...</span>
        <span className="text-xs text-gray-400 mt-1">잠시만 기다려주세요</span>
      </div>
    );
  }

  // 실패
  if (status === 'failed') {
    return (
      <div className="py-8 text-center">
        <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-2" />
        <p className="text-sm text-red-500 mb-1">분석 중 오류가 발생했습니다</p>
        {analysis?.commit_analysis_error && (
          <p className="text-xs text-gray-400 mb-4">{analysis.commit_analysis_error}</p>
        )}
        <button
          onClick={onTrigger}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-gray-600 hover:text-primary-600 hover:bg-gray-100 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          재시도
        </button>
      </div>
    );
  }

  // 완료 → 마크다운 렌더링
  if (status === 'completed' && analysis?.commit_analysis_result) {
    return (
      <div>
        <div className="prose prose-sm max-w-none text-gray-700">
          <ReactMarkdown>{analysis.commit_analysis_result}</ReactMarkdown>
        </div>
        {analysis.commit_analyzed_at && (
          <div className="mt-4 pt-3 border-t border-gray-100 text-xs text-gray-400 text-right">
            분석 완료: {new Date(analysis.commit_analyzed_at).toLocaleString('ko-KR')}
          </div>
        )}
      </div>
    );
  }

  return (
    <p className="text-sm text-gray-500 py-6 text-center">분석 결과가 없습니다.</p>
  );
}
