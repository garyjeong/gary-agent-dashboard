'use client';

import { MoreVertical, Play, Pencil, Trash2, ArrowRight } from 'lucide-react';
import { useState } from 'react';
import { clsx } from 'clsx';
import type { Issue, IssueStatus } from '@/types';

interface IssueCardProps {
  issue: Issue;
  onEdit: () => void;
  onDelete: () => void;
  onWorkRequest: () => void;
  onStatusChange: (status: IssueStatus) => void;
}

const priorityColors = {
  low: 'bg-gray-100 text-gray-600',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-red-100 text-red-700',
};

const priorityLabels = {
  low: '낮음',
  medium: '보통',
  high: '높음',
};

const statusOptions: { value: IssueStatus; label: string }[] = [
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'done', label: 'Done' },
];

export function IssueCard({
  issue,
  onEdit,
  onDelete,
  onWorkRequest,
  onStatusChange,
}: IssueCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
      {/* 헤더 */}
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-medium text-gray-900 flex-1 pr-2">{issue.title}</h4>
        
        {/* 메뉴 */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
          
          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute right-0 top-6 z-20 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[140px]">
                <button
                  onClick={() => { onEdit(); setMenuOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Pencil className="w-4 h-4" />
                  수정
                </button>
                <button
                  onClick={() => { onWorkRequest(); setMenuOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-primary-600 hover:bg-gray-50"
                >
                  <Play className="w-4 h-4" />
                  작업 요청
                </button>
                <hr className="my-1" />
                <button
                  onClick={() => { onDelete(); setMenuOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                  삭제
                </button>
              </div>
            </>
          )}
        </div>
      </div>
      
      {/* 설명 */}
      {issue.description && (
        <p className="text-sm text-gray-500 mb-3 line-clamp-2">
          {issue.description}
        </p>
      )}
      
      {/* 리포 정보 */}
      {issue.repo_full_name && (
        <p className="text-xs text-gray-400 mb-2">
          📁 {issue.repo_full_name}
        </p>
      )}
      
      {/* 하단 */}
      <div className="flex items-center justify-between">
        <span className={clsx(
          'text-xs px-2 py-0.5 rounded-full',
          priorityColors[issue.priority]
        )}>
          {priorityLabels[issue.priority]}
        </span>
        
        {/* 상태 변경 버튼 */}
        <select
          value={issue.status}
          onChange={(e) => onStatusChange(e.target.value as IssueStatus)}
          className="text-xs border border-gray-200 rounded px-2 py-1 text-gray-600 bg-white"
        >
          {statusOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
