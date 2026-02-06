'use client';

import { useDroppable } from '@dnd-kit/core';
import { clsx } from 'clsx';
import { IssueCard } from './IssueCard';
import { Inbox } from 'lucide-react';
import type { Issue, IssueStatus } from '@/types';

interface IssueColumnProps {
  title: string;
  status: IssueStatus;
  issues: Issue[];
  onView: (issue: Issue) => void;
  onEdit: (issue: Issue) => void;
  onDelete: (id: number) => void;
  onWorkRequest: (id: number) => void;
  onStatusChange: (issue: Issue, status: IssueStatus) => void;
}

const statusColors: Record<IssueStatus, string> = {
  todo: 'bg-gray-400',
  in_progress: 'bg-blue-500',
  done: 'bg-green-500',
};

export function IssueColumn({
  title,
  status,
  issues,
  onView,
  onEdit,
  onDelete,
  onWorkRequest,
  onStatusChange,
}: IssueColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div className="flex-1 min-w-[280px] max-w-[360px] flex flex-col">
      {/* 컬럼 헤더 */}
      <div className="flex items-center gap-2 px-1 py-2">
        <div className={`w-2 h-2 rounded-full ${statusColors[status]}`} />
        <h3 className="text-sm font-medium text-gray-700">{title}</h3>
        <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
          {issues.length}
        </span>
      </div>

      {/* 카드 목록 (드롭 영역) */}
      <div
        ref={setNodeRef}
        className={clsx(
          'flex-1 space-y-2 min-h-[200px] pt-1 rounded-lg transition-colors',
          isOver && 'bg-primary-50 ring-2 ring-primary-200 ring-inset',
        )}
      >
        {issues.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-300">
            <div className="w-16 h-16 mb-3 rounded-full bg-gray-50 flex items-center justify-center">
              <Inbox className="w-7 h-7 text-gray-300" />
            </div>
            <p className="text-xs font-medium text-gray-400 mb-0.5">일감이 없습니다</p>
            <p className="text-2xs text-gray-300">드래그하여 일감을 이동하세요</p>
          </div>
        ) : (
          issues.map((issue) => (
            <IssueCard
              key={issue.id}
              issue={issue}
              onView={() => onView(issue)}
              onEdit={() => onEdit(issue)}
              onDelete={() => onDelete(issue.id)}
              onWorkRequest={() => onWorkRequest(issue.id)}
              onStatusChange={(s) => onStatusChange(issue, s)}
            />
          ))
        )}
      </div>
    </div>
  );
}
