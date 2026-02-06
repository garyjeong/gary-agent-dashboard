'use client';

import { X } from 'lucide-react';
import { useState } from 'react';
import { useRepos, useAuth, useLabels } from '@/hooks';
import { Button } from '@/components/ui';
import type { Issue, IssueUpdate, IssueStatus, IssuePriority, Label } from '@/types';

interface EditIssueModalProps {
  issue: Issue;
  onClose: () => void;
  onSubmit: (id: number, data: IssueUpdate) => void;
}

export function EditIssueModal({ issue, onClose, onSubmit }: EditIssueModalProps) {
  const { isLoggedIn } = useAuth();
  const { repos } = useRepos();
  const { labels: availableLabels } = useLabels();

  const [formData, setFormData] = useState({
    title: issue.title,
    description: issue.description ?? '',
    status: issue.status,
    priority: issue.priority,
    repo_full_name: issue.repo_full_name ?? '',
    behavior_example: issue.behavior_example ?? '',
    label_ids: issue.labels?.map((l: Label) => l.id) ?? [] as number[],
  });

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await onSubmit(issue.id, {
        ...formData,
        description: formData.description || undefined,
        repo_full_name: formData.repo_full_name || undefined,
        behavior_example: formData.behavior_example || undefined,
        label_ids: formData.label_ids,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 배경 */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      {/* 모달 */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-900">
            일감 수정
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 폼 */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-auto">
          {/* 기본 정보 */}
          <div className="px-5 py-4 space-y-4">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              기본 정보
            </div>

            {/* 제목 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                제목 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                className="input"
                placeholder="일감 제목을 입력하세요"
              />
            </div>

            {/* 설명 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                설명
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="input resize-none"
                placeholder="일감에 대한 상세 설명"
              />
            </div>

            {/* 상태 & 우선순위 */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  상태
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as IssueStatus })}
                  className="input"
                >
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="done">Done</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  우선순위
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value as IssuePriority })}
                  className="input"
                >
                  <option value="low">낮음</option>
                  <option value="medium">보통</option>
                  <option value="high">높음</option>
                </select>
              </div>
            </div>

            {/* 라벨 */}
            {availableLabels.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  라벨
                </label>
                <div className="flex flex-wrap gap-2">
                  {availableLabels.map((label) => {
                    const selected = formData.label_ids.includes(label.id);
                    return (
                      <button
                        key={label.id}
                        type="button"
                        onClick={() => {
                          setFormData({
                            ...formData,
                            label_ids: selected
                              ? formData.label_ids.filter((id) => id !== label.id)
                              : [...formData.label_ids, label.id],
                          });
                        }}
                        className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium transition-all border"
                        style={{
                          backgroundColor: selected ? `${label.color}20` : 'transparent',
                          color: selected ? label.color : '#6B7280',
                          borderColor: selected ? label.color : '#E5E7EB',
                        }}
                      >
                        {label.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* GitHub 연동 */}
          <div className="px-5 py-4 space-y-4 border-t border-gray-100">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              GitHub 연동
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                리포지토리
              </label>
              {isLoggedIn && repos.length > 0 ? (
                <select
                  value={formData.repo_full_name}
                  onChange={(e) => setFormData({ ...formData, repo_full_name: e.target.value })}
                  className="input"
                >
                  <option value="">선택하세요</option>
                  {repos.map((repo) => (
                    <option key={repo.id} value={repo.full_name}>
                      {repo.full_name} {repo.private ? '(Private)' : ''}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={formData.repo_full_name}
                  onChange={(e) => setFormData({ ...formData, repo_full_name: e.target.value })}
                  className="input"
                  placeholder="owner/repo-name"
                />
              )}
              {!isLoggedIn && (
                <p className="mt-1.5 text-xs text-gray-400">
                  GitHub 로그인 시 리포지토리 목록에서 선택할 수 있습니다.
                </p>
              )}
            </div>
          </div>

          {/* 작업 지침 */}
          <div className="px-5 py-4 space-y-4 border-t border-gray-100">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              작업 지침
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                동작 예시
              </label>
              <textarea
                value={formData.behavior_example}
                onChange={(e) => setFormData({ ...formData, behavior_example: e.target.value })}
                rows={5}
                className="input resize-none font-mono text-xs"
                placeholder="에이전트가 수행할 작업 순서를 작성하세요"
              />
            </div>
          </div>
        </form>

        {/* 푸터 */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-100 bg-gray-50">
          <Button type="button" variant="secondary" onClick={onClose}>
            취소
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={loading || !formData.title}
            onClick={handleSubmit}
          >
            {loading ? '저장 중...' : '수정'}
          </Button>
        </div>
      </div>
    </div>
  );
}
