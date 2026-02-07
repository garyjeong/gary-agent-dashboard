'use client';

import { useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { useRepos, useAuth } from '@/hooks';
import { Modal } from '@/components/ui/Modal';
import { clsx } from 'clsx';
import type { IssueCreate } from '@/types';

interface CreateIssueModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: IssueCreate) => void;
}

export function CreateIssueModal({ open, onClose, onSubmit }: CreateIssueModalProps) {
  const { isLoggedIn } = useAuth();
  const { repos } = useRepos();

  const [description, setDescription] = useState('');
  const [repoFullName, setRepoFullName] = useState('');
  const [loading, setLoading] = useState(false);

  const canSubmit = description.trim().length > 0;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    try {
      await onSubmit({
        title: description.trim().split('\n')[0].slice(0, 100),
        description: description.trim(),
        repo_full_name: repoFullName || undefined,
      });
      setDescription('');
      setRepoFullName('');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.metaKey && canSubmit) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="새 일감" size="md">
      <div className="space-y-4" onKeyDown={handleKeyDown}>
        {/* 설명 */}
        <div>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            autoFocus
            className="w-full text-sm text-gray-700 placeholder-gray-400 border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 resize-none transition-colors"
            placeholder="어떤 작업이 필요한지 설명해주세요..."
          />
        </div>

        {/* 리포지토리 선택 */}
        {isLoggedIn && repos.length > 0 && (
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">리포지토리</label>
            <select
              value={repoFullName}
              onChange={(e) => setRepoFullName(e.target.value)}
              className="w-full text-sm text-gray-600 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 bg-white"
            >
              <option value="">AI가 자동 선택 (또는 직접 선택)</option>
              {repos.map((repo) => (
                <option key={repo.id} value={repo.full_name}>
                  {repo.full_name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* AI 자동 생성 안내 */}
        <div className="flex items-center gap-2 px-3 py-2 bg-purple-50 rounded-lg border border-purple-100">
          <Sparkles className="w-4 h-4 text-purple-500 shrink-0" />
          <p className="text-xs text-purple-600">
            AI가 제목, 우선순위, 카테고리, 리포지토리, 작업 계획을 자동으로 생성합니다.
          </p>
        </div>

        {/* 하단 버튼 */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <span className="text-2xs text-gray-400">
            ⌘ Enter로 생성
          </span>
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
              disabled={loading || !canSubmit}
              className={clsx(
                'inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium rounded-md transition-colors',
                canSubmit && !loading
                  ? 'bg-primary-600 text-white hover:bg-primary-700'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed',
              )}
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              생성
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
