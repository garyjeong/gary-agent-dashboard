'use client';

import { useState } from 'react';
import { Loader2, ArrowUp, ArrowRight, ArrowDown } from 'lucide-react';
import { useRepos, useAuth, useLabels } from '@/hooks';
import { Modal } from '@/components/ui/Modal';
import { clsx } from 'clsx';
import type { Issue, IssueCreate, IssueUpdate, IssueStatus, IssuePriority, Label } from '@/types';

interface IssueModalProps {
  issue?: Issue;
  onClose: () => void;
  onSubmit: (data: IssueCreate | IssueUpdate) => Promise<void>;
}

const priorityOptions: { value: IssuePriority; label: string; icon: typeof ArrowUp; color: string }[] = [
  { value: 'high', label: '높음', icon: ArrowUp, color: 'text-red-500' },
  { value: 'medium', label: '보통', icon: ArrowRight, color: 'text-yellow-500' },
  { value: 'low', label: '낮음', icon: ArrowDown, color: 'text-blue-500' },
];

const statusOptions: { value: IssueStatus; label: string }[] = [
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'done', label: 'Done' },
];

export function IssueModal({ issue, onClose, onSubmit }: IssueModalProps) {
  const isEdit = !!issue;
  const { isLoggedIn } = useAuth();
  const { repos } = useRepos();
  const { labels: availableLabels } = useLabels();

  const [title, setTitle] = useState(issue?.title ?? '');
  const [description, setDescription] = useState(issue?.description ?? '');
  const [issueStatus, setIssueStatus] = useState<IssueStatus>(issue?.status ?? 'todo');
  const [priority, setPriority] = useState<IssuePriority>(issue?.priority ?? 'medium');
  const [repoFullName, setRepoFullName] = useState(issue?.repo_full_name ?? '');
  const [labelIds, setLabelIds] = useState<number[]>(issue?.labels?.map((l: Label) => l.id) ?? []);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setLoading(true);
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim() || undefined,
        status: issueStatus,
        priority,
        repo_full_name: repoFullName || undefined,
        label_ids: labelIds,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.metaKey && title.trim()) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <Modal open onClose={onClose} title={isEdit ? '일감 수정' : '새 일감'} size="md">
      <div className="space-y-4" onKeyDown={handleKeyDown}>
        {/* 제목 */}
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoFocus
          className="w-full text-base font-medium text-gray-900 placeholder-gray-400 border-0 border-b border-gray-200 px-0 py-2 focus:outline-none focus:border-primary-500 focus:ring-0 transition-colors"
          placeholder="일감 제목"
        />

        {/* 설명 */}
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full text-sm text-gray-700 placeholder-gray-400 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 resize-none transition-colors"
          placeholder="설명 (선택)"
        />

        {/* 속성 행: 상태(수정 시만) + 우선순위 + 리포지토리 */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* 상태 (수정 시에만) */}
          {isEdit && (
            <div className="flex items-center rounded-lg border border-gray-200 overflow-hidden">
              {statusOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setIssueStatus(opt.value)}
                  className={clsx(
                    'px-2.5 py-1.5 text-xs font-medium transition-colors',
                    issueStatus === opt.value
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50',
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          {/* 우선순위 */}
          <div className="flex items-center rounded-lg border border-gray-200 overflow-hidden">
            {priorityOptions.map((opt) => {
              const Icon = opt.icon;
              const isActive = priority === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setPriority(opt.value)}
                  className={clsx(
                    'flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium transition-colors',
                    isActive
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50',
                  )}
                >
                  <Icon className={clsx('w-3.5 h-3.5', isActive && opt.color)} />
                  {opt.label}
                </button>
              );
            })}
          </div>

          {/* 리포지토리 */}
          {isLoggedIn && repos.length > 0 && (
            <select
              value={repoFullName}
              onChange={(e) => setRepoFullName(e.target.value)}
              className="text-xs text-gray-600 border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 bg-white"
            >
              <option value="">리포지토리</option>
              {repos.map((repo) => (
                <option key={repo.id} value={repo.full_name}>
                  {repo.full_name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* 라벨 */}
        {availableLabels.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {availableLabels.map((label) => {
              const selected = labelIds.includes(label.id);
              return (
                <button
                  key={label.id}
                  type="button"
                  onClick={() => {
                    setLabelIds((prev) =>
                      selected ? prev.filter((id) => id !== label.id) : [...prev, label.id],
                    );
                  }}
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-medium transition-all border"
                  style={{
                    backgroundColor: selected ? `${label.color}20` : 'transparent',
                    color: selected ? label.color : '#9CA3AF',
                    borderColor: selected ? `${label.color}40` : '#E5E7EB',
                  }}
                >
                  {label.name}
                </button>
              );
            })}
          </div>
        )}

        {/* 하단 */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <span className="text-2xs text-gray-400">⌘ Enter로 {isEdit ? '저장' : '생성'}</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading || !title.trim()}
              className={clsx(
                'inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium rounded-md transition-colors',
                title.trim() && !loading
                  ? 'bg-primary-600 text-white hover:bg-primary-700'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed',
              )}
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {isEdit ? '저장' : '생성'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
