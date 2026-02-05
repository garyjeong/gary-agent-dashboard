'use client';

import { IssueCard } from './IssueCard';
import type { Issue, IssueStatus } from '@/types';

interface IssueColumnProps {
  title: string;
  color: string;
  issues: Issue[];
  onEdit: (issue: Issue) => void;
  onDelete: (id: number) => void;
  onWorkRequest: (id: number) => void;
  onStatusChange: (issue: Issue, status: IssueStatus) => void;
}

export function IssueColumn({
  title,
  color,
  issues,
  onEdit,
  onDelete,
  onWorkRequest,
  onStatusChange,
}: IssueColumnProps) {
  return (
    <div className="flex-1 min-w-[300px] max-w-[400px]">
      {/* 컬럼 헤더 */}
      <div className={`${color} rounded-t-lg px-4 py-3`}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">{title}</h3>
          <span className="bg-white/60 text-gray-600 text-sm px-2 py-0.5 rounded-full">
            {issues.length}
          </span>
        </div>
      </div>
      
      {/* 카드 목록 */}
      <div className="bg-gray-50 rounded-b-lg p-3 space-y-3 min-h-[200px]">
        {issues.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-8">
            일감이 없습니다
          </p>
        ) : (
          issues.map((issue) => (
            <IssueCard
              key={issue.id}
              issue={issue}
              onEdit={() => onEdit(issue)}
              onDelete={() => onDelete(issue.id)}
              onWorkRequest={() => onWorkRequest(issue.id)}
              onStatusChange={(status) => onStatusChange(issue, status)}
            />
          ))
        )}
      </div>
    </div>
  );
}
