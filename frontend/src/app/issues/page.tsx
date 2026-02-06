'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { useIssues } from '@/hooks/useIssues';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { formatRelativeTime } from '@/lib/timeUtils';
import { GitBranch, User, Tag } from 'lucide-react';
import Link from 'next/link';
import type { Issue, IssueStatus, IssuePriority } from '@/types';
import { clsx } from 'clsx';

/**
 * 상태 뱃지 매핑
 */
const statusConfig: Record<IssueStatus, { label: string; variant: 'default' | 'info' | 'success' }> = {
  todo: { label: '할 일', variant: 'default' },
  in_progress: { label: '진행 중', variant: 'info' },
  done: { label: '완료', variant: 'success' },
};

/**
 * 우선순위 뱃지 매핑
 */
const priorityConfig: Record<IssuePriority, { label: string; variant: 'default' | 'warning' | 'danger' }> = {
  low: { label: '낮음', variant: 'default' },
  medium: { label: '보통', variant: 'warning' },
  high: { label: '높음', variant: 'danger' },
};

/**
 * 테이블 행 스켈레톤
 */
function TableRowSkeleton() {
  return (
    <tr className="border-b border-gray-100">
      <td className="px-4 py-4">
        <div className="h-4 bg-gray-200 rounded w-12 animate-pulse" />
      </td>
      <td className="px-4 py-4">
        <div className="h-4 bg-gray-200 rounded w-48 animate-pulse" />
      </td>
      <td className="px-4 py-4">
        <div className="h-5 bg-gray-200 rounded-full w-16 animate-pulse" />
      </td>
      <td className="px-4 py-4">
        <div className="h-5 bg-gray-200 rounded-full w-16 animate-pulse" />
      </td>
      <td className="px-4 py-4">
        <div className="h-4 bg-gray-200 rounded w-32 animate-pulse" />
      </td>
      <td className="px-4 py-4">
        <div className="h-4 bg-gray-200 rounded w-20 animate-pulse" />
      </td>
      <td className="px-4 py-4">
        <div className="h-4 bg-gray-200 rounded w-16 animate-pulse" />
      </td>
    </tr>
  );
}

/**
 * 일감 테이블 행 컴포넌트
 */
function IssueTableRow({ issue }: { issue: Issue }) {
  const statusInfo = statusConfig[issue.status];
  const priorityInfo = priorityConfig[issue.priority];

  return (
    <Link href={`/?focus=${issue.id}`} passHref legacyBehavior>
      <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer">
        {/* ID */}
        <td className="px-4 py-4 text-sm text-gray-500 font-mono">
          #{issue.id}
        </td>

        {/* 제목 */}
        <td className="px-4 py-4">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-gray-900 hover:text-primary-600 transition-colors">
              {issue.title}
            </span>
            {issue.description && (
              <span className="text-xs text-gray-500 line-clamp-1">
                {issue.description}
              </span>
            )}
          </div>
        </td>

        {/* 상태 */}
        <td className="px-4 py-4">
          <Badge variant={statusInfo.variant} size="sm">
            {statusInfo.label}
          </Badge>
        </td>

        {/* 우선순위 */}
        <td className="px-4 py-4">
          <Badge variant={priorityInfo.variant} size="sm">
            {priorityInfo.label}
          </Badge>
        </td>

        {/* 리포지토리 */}
        <td className="px-4 py-4">
          {issue.repo_full_name ? (
            <div className="flex items-center gap-1.5 text-sm text-gray-600">
              <GitBranch className="w-3.5 h-3.5 text-gray-400" />
              <span className="truncate max-w-[200px]">{issue.repo_full_name}</span>
            </div>
          ) : (
            <span className="text-xs text-gray-400">-</span>
          )}
        </td>

        {/* 라벨 */}
        <td className="px-4 py-4">
          {issue.labels && issue.labels.length > 0 ? (
            <div className="flex items-center gap-1">
              <Tag className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-xs text-gray-600">
                {issue.labels.length}개
              </span>
            </div>
          ) : (
            <span className="text-xs text-gray-400">-</span>
          )}
        </td>

        {/* 업데이트 */}
        <td className="px-4 py-4 text-xs text-gray-500">
          {formatRelativeTime(issue.updated_at)}
        </td>
      </tr>
    </Link>
  );
}

/**
 * 일감 목록 페이지
 * 모든 일감을 테이블 형태로 표시합니다.
 */
export default function IssuesPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { issues, total, isLoading, mutate } = useIssues();

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          title="일감 목록"
          onMenuClick={() => setSidebarOpen(true)}
          onRefresh={() => mutate()}
        />
        <main className="flex-1 overflow-auto p-4 lg:p-6">
          <div className="max-w-7xl mx-auto">
            {/* 헤더 섹션 */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-xl font-semibold text-gray-900 mb-1">
                  전체 일감
                </h1>
                <p className="text-sm text-gray-500">
                  {isLoading ? '로딩 중...' : `총 ${total}개의 일감`}
                </p>
              </div>
            </div>

            {/* 테이블 카드 */}
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-xs font-medium text-gray-500 border-b border-gray-200 bg-gray-50">
                      <th className="px-4 py-3 font-medium">ID</th>
                      <th className="px-4 py-3 font-medium">제목</th>
                      <th className="px-4 py-3 font-medium">상태</th>
                      <th className="px-4 py-3 font-medium">우선순위</th>
                      <th className="px-4 py-3 font-medium">리포지토리</th>
                      <th className="px-4 py-3 font-medium">라벨</th>
                      <th className="px-4 py-3 font-medium">업데이트</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* 로딩 상태 */}
                    {isLoading &&
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRowSkeleton key={i} />
                      ))}

                    {/* 빈 상태 */}
                    {!isLoading && issues.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-4 py-16 text-center">
                          <div className="flex flex-col items-center gap-3">
                            <div className="text-gray-400">
                              <svg
                                className="w-12 h-12 mx-auto"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={1.5}
                                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                                />
                              </svg>
                            </div>
                            <div>
                              <h3 className="text-base font-medium text-gray-900 mb-1">
                                등록된 일감이 없습니다
                              </h3>
                              <p className="text-sm text-gray-500">
                                대시보드에서 새 일감을 생성해보세요.
                              </p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}

                    {/* 일감 목록 */}
                    {!isLoading &&
                      issues.map((issue) => (
                        <IssueTableRow key={issue.id} issue={issue} />
                      ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* 하단 요약 정보 */}
            {!isLoading && issues.length > 0 && (
              <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <Badge variant="default" size="sm">
                      할 일
                    </Badge>
                    <span>
                      {issues.filter((i) => i.status === 'todo').length}개
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="info" size="sm">
                      진행 중
                    </Badge>
                    <span>
                      {issues.filter((i) => i.status === 'in_progress').length}개
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="success" size="sm">
                      완료
                    </Badge>
                    <span>
                      {issues.filter((i) => i.status === 'done').length}개
                    </span>
                  </div>
                </div>
                <div className="text-xs text-gray-400">
                  테이블 형식으로 보기 • 칸반 보드는{' '}
                  <Link href="/" className="text-primary-600 hover:underline">
                    대시보드
                  </Link>
                  에서
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
