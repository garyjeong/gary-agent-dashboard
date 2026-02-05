'use client';

import { X } from 'lucide-react';
import { useState } from 'react';
import { useRepos, useAuth } from '@/hooks';
import type { Issue, IssueCreate, IssueUpdate, IssueStatus, IssuePriority } from '@/types';

interface IssueModalProps {
  issue?: Issue;
  onClose: () => void;
  onSubmit: (data: IssueCreate | IssueUpdate) => Promise<void>;
}

export function IssueModal({ issue, onClose, onSubmit }: IssueModalProps) {
  const isEdit = !!issue;
  const { isLoggedIn } = useAuth();
  const { repos, isLoading: reposLoading } = useRepos();
  
  const [formData, setFormData] = useState({
    title: issue?.title ?? '',
    description: issue?.description ?? '',
    status: issue?.status ?? 'todo' as IssueStatus,
    priority: issue?.priority ?? 'medium' as IssuePriority,
    repo_full_name: issue?.repo_full_name ?? '',
    behavior_example: issue?.behavior_example ?? '',
  });
  
  const [loading, setLoading] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await onSubmit({
        ...formData,
        description: formData.description || undefined,
        repo_full_name: formData.repo_full_name || undefined,
        behavior_example: formData.behavior_example || undefined,
      });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 배경 */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      
      {/* 모달 */}
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-auto">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            {isEdit ? '일감 수정' : '새 일감 생성'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* 폼 */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* 제목 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              제목 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="일감 제목을 입력하세요"
            />
          </div>
          
          {/* 설명 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              설명
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="일감에 대한 상세 설명"
            />
          </div>
          
          {/* 상태 & 우선순위 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                상태
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as IssueStatus })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Done</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                우선순위
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as IssuePriority })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="low">낮음</option>
                <option value="medium">보통</option>
                <option value="high">높음</option>
              </select>
            </div>
          </div>
          
          {/* GitHub 리포 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              GitHub 리포지토리
            </label>
            {isLoggedIn && repos.length > 0 ? (
              <select
                value={formData.repo_full_name}
                onChange={(e) => setFormData({ ...formData, repo_full_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">선택하세요</option>
                {repos.map((repo) => (
                  <option key={repo.id} value={repo.full_name}>
                    {repo.full_name} {repo.private ? '🔒' : ''}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={formData.repo_full_name}
                onChange={(e) => setFormData({ ...formData, repo_full_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="예: owner/repo-name (GitHub 로그인 시 선택 가능)"
              />
            )}
          </div>
          
          {/* 동작 예시 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              동작 예시
            </label>
            <textarea
              value={formData.behavior_example}
              onChange={(e) => setFormData({ ...formData, behavior_example: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-mono text-sm"
              placeholder="에이전트가 수행할 작업 순서를 작성하세요"
            />
          </div>
          
          {/* 버튼 */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading || !formData.title}
              className="px-4 py-2 text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '저장 중...' : isEdit ? '수정' : '생성'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
