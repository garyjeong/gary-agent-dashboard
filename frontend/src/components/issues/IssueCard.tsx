'use client';

import { MoreVertical, Play, Pencil, Trash2, GitBranch } from 'lucide-react';
import { useState } from 'react';
import { clsx } from 'clsx';
import type { Issue, IssueStatus } from '@/types';
import { Badge } from '@/components/ui';
import { formatRelativeTime } from '@/lib/timeUtils';

interface IssueCardProps {
  issue: Issue;
  onEdit: () => void;
  onDelete: () => void;
  onWorkRequest: () => void;
  onStatusChange: (status: IssueStatus) => void;
}

const priorityColors = {
  low: 'bg-gray-300',
  medium: 'bg-yellow-400',
  high: 'bg-red-500',
};

const priorityLabels = {
  low: '낮음',
  medium: '보통',
  high: '높음',
};

export function IssueCard({
  issue,
  onEdit,
  onDelete,
  onWorkRequest,
}: IssueCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="group relative bg-white rounded-md border border-gray-200 hover:border-gray-300 transition-all"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 좌측 우선순위 인디케이터 */}
      <div
        className={clsx(
          'absolute left-0 top-0 bottom-0 w-1 rounded-l-md',
          priorityColors[issue.priority]
        )}
      />

      <div className="pl-4 pr-3 py-3">
        {/* 리포지토리 정보 */}
        {issue.repo_full_name && (
          <div className="flex items-center gap-1.5 mb-1.5">
            <GitBranch className="w-3 h-3 text-gray-400" />
            <span className="text-2xs text-gray-400 truncate">
              {issue.repo_full_name}
            </span>
          </div>
        )}

        {/* 헤더: 제목 + 메뉴 */}
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-sm font-medium text-gray-900 leading-snug flex-1">
            {issue.title}
          </h4>

          {/* 메뉴 (호버 시 표시) */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className={clsx(
                'p-1 text-gray-400 hover:text-gray-600 rounded transition-opacity',
                isHovered || menuOpen ? 'opacity-100' : 'opacity-0'
              )}
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {menuOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setMenuOpen(false)}
                />
                <div className="absolute right-0 top-6 z-20 bg-white rounded-md shadow-lg border border-gray-200 py-1 min-w-[120px]">
                  <button
                    onClick={() => { onEdit(); setMenuOpen(false); }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    수정
                  </button>
                  <button
                    onClick={() => { onWorkRequest(); setMenuOpen(false); }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-primary-600 hover:bg-gray-50"
                  >
                    <Play className="w-3.5 h-3.5" />
                    작업 요청
                  </button>
                  <hr className="my-1 border-gray-100" />
                  <button
                    onClick={() => { onDelete(); setMenuOpen(false); }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    삭제
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* 설명 */}
        {issue.description && (
          <p className="text-xs text-gray-500 mt-1.5 line-clamp-2 leading-relaxed">
            {issue.description}
          </p>
        )}

        {/* 라벨 */}
        {issue.labels && issue.labels.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {issue.labels.map((label) => (
              <span
                key={label.id}
                className="inline-flex items-center px-1.5 py-0.5 rounded text-2xs font-medium"
                style={{
                  backgroundColor: `${label.color}18`,
                  color: label.color,
                  border: `1px solid ${label.color}30`,
                }}
              >
                {label.name}
              </span>
            ))}
          </div>
        )}

        {/* 하단: 우선순위 + 시간 */}
        <div className="flex items-center justify-between mt-3">
          <Badge
            variant={issue.priority === 'high' ? 'danger' : issue.priority === 'medium' ? 'warning' : 'default'}
            size="sm"
          >
            {priorityLabels[issue.priority]}
          </Badge>

          <span className="text-2xs text-gray-400">
            {formatRelativeTime(issue.updated_at)}
          </span>
        </div>
      </div>
    </div>
  );
}
