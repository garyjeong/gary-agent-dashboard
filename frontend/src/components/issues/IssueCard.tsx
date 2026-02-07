'use client';

import { MoreVertical, Play, Pencil, Trash2, GitBranch, GripVertical, User, Calendar, Sparkles, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { clsx } from 'clsx';
import type { Issue, IssueStatus } from '@/types';
import { Badge } from '@/components/ui';
import { formatRelativeTime } from '@/lib/timeUtils';

interface IssueCardProps {
  issue: Issue;
  onView?: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onWorkRequest: () => void;
  onStatusChange: (status: IssueStatus) => void;
}

const priorityConfig = {
  low: { color: 'bg-gray-400', border: 'border-l-gray-400', label: '낮음', icon: '○' },
  medium: { color: 'bg-amber-400', border: 'border-l-amber-400', label: '보통', icon: '◐' },
  high: { color: 'bg-red-500', border: 'border-l-red-500', label: '높음', icon: '●' },
};

export function IssueCard({
  issue,
  onView,
  onEdit,
  onDelete,
  onWorkRequest,
}: IssueCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: issue.id,
  });

  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
    : undefined;

  const priority = priorityConfig[issue.priority];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={clsx(
        'group relative bg-white rounded-lg border-l-[3px] shadow-sm transition-all cursor-pointer',
        priority.border,
        isDragging
          ? 'opacity-40 shadow-none'
          : 'hover:shadow-md border-r border-t border-b border-r-gray-200 border-t-gray-200 border-b-gray-200 hover:border-r-gray-300 hover:border-t-gray-300 hover:border-b-gray-300',
      )}
      onDoubleClick={onView}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); setMenuOpen(false); }}
    >
      <div className="px-3.5 py-3">
        {/* 상단: ID + 리포 + 드래그/메뉴 */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[10px] font-mono text-gray-400 shrink-0">#{issue.id}</span>
            {issue.repo_full_name && (
              <div className="flex items-center gap-1 min-w-0">
                <GitBranch className="w-3 h-3 text-gray-400 shrink-0" />
                <span className="text-[10px] text-gray-400 truncate">
                  {issue.repo_full_name.split('/')[1] || issue.repo_full_name}
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-0.5">
            <button
              {...attributes}
              {...listeners}
              className={clsx(
                'p-0.5 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing rounded transition-opacity touch-none',
                isHovered || isDragging ? 'opacity-100' : 'opacity-0'
              )}
              aria-label="드래그하여 이동"
            >
              <GripVertical className="w-3.5 h-3.5" />
            </button>
            <div className="relative">
              <button
                onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
                className={clsx(
                  'p-0.5 text-gray-400 hover:text-gray-600 rounded transition-opacity',
                  isHovered || menuOpen ? 'opacity-100' : 'opacity-0'
                )}
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </button>

              {menuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setMenuOpen(false)}
                  />
                  <div className="absolute right-0 top-6 z-20 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[130px]">
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
        </div>

        {/* 제목 */}
        <h4
          className="text-[13px] font-semibold text-gray-900 leading-snug cursor-pointer hover:text-primary-600 transition-colors line-clamp-2"
          onClick={onView}
        >
          {issue.title}
        </h4>

        {/* 설명 */}
        {issue.description && (
          <p className="text-xs text-gray-500 mt-1.5 line-clamp-2 leading-relaxed">
            {issue.description}
          </p>
        )}

        {/* 라벨 */}
        {issue.labels && issue.labels.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2.5">
            {issue.labels.map((label) => (
              <span
                key={label.id}
                className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold"
                style={{
                  backgroundColor: `${label.color}15`,
                  color: label.color,
                }}
              >
                {label.name}
              </span>
            ))}
          </div>
        )}

        {/* AI 상태 */}
        {issue.ai_plan_status === 'generating' && (
          <div className="flex items-center gap-1.5 mt-2.5 px-2 py-1 bg-purple-50 rounded-md">
            <Loader2 className="w-3 h-3 text-purple-500 animate-spin" />
            <span className="text-[10px] text-purple-600 font-medium">AI 생성 중...</span>
          </div>
        )}
        {issue.ai_plan_status === 'completed' && issue.behavior_example && (
          <div className="flex items-center gap-1.5 mt-2.5">
            <Sparkles className="w-3 h-3 text-purple-400" />
            <span className="text-[10px] text-purple-500">AI 작업 계획 생성됨</span>
          </div>
        )}

        {/* 하단 메타 정보 */}
        <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-gray-100">
          <div className="flex items-center gap-2">
            {/* 우선순위 */}
            <span className={clsx(
              'inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md',
              issue.priority === 'high' && 'bg-red-50 text-red-600',
              issue.priority === 'medium' && 'bg-amber-50 text-amber-600',
              issue.priority === 'low' && 'bg-gray-100 text-gray-500',
            )}>
              <span>{priority.icon}</span>
              {priority.label}
            </span>

            {/* 큐 상태 */}
            {issue.latest_queue_status && (
              <Badge
                variant={
                  issue.latest_queue_status === 'completed' ? 'success'
                  : issue.latest_queue_status === 'in_progress' ? 'info'
                  : issue.latest_queue_status === 'failed' ? 'danger'
                  : 'default'
                }
                size="sm"
              >
                {issue.latest_queue_status === 'pending' ? '대기 중'
                  : issue.latest_queue_status === 'in_progress' ? '작업 중'
                  : issue.latest_queue_status === 'completed' ? '완료'
                  : '실패'}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2 text-[10px] text-gray-400">
            {issue.assignee && (
              <span className="flex items-center gap-0.5">
                <User className="w-3 h-3" />
                {issue.assignee}
              </span>
            )}
            {issue.due_date && (
              <span className="flex items-center gap-0.5">
                <Calendar className="w-3 h-3" />
                {new Date(issue.due_date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
              </span>
            )}
            <span>{formatRelativeTime(issue.updated_at)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
