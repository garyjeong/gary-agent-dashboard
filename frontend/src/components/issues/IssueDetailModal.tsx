'use client';

import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { X, GitBranch, ExternalLink, Clock, CheckCircle, XCircle, Loader2, AlertCircle, User, Calendar } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { clsx } from 'clsx';
import { Badge, Button, useToast } from '@/components/ui';
import { issueService } from '@/services/issueService';
import { fetcher, fetcherWithOptions } from '@/lib/fetcher';
import { formatRelativeTime } from '@/lib/timeUtils';
import type { Issue, QueueItem, Comment } from '@/types';

interface IssueDetailModalProps {
  issue: Issue;
  onClose: () => void;
  onEdit: () => void;
}

const priorityLabels = { low: '낮음', medium: '보통', high: '높음' };
const statusLabels = { todo: 'To Do', in_progress: 'In Progress', done: 'Done' };

const queueStatusConfig: Record<string, { icon: typeof CheckCircle; color: string; label: string }> = {
  pending: { icon: Clock, color: 'text-gray-400', label: '대기 중' },
  in_progress: { icon: Loader2, color: 'text-blue-500', label: '진행 중' },
  completed: { icon: CheckCircle, color: 'text-green-500', label: '완료' },
  failed: { icon: XCircle, color: 'text-red-500', label: '실패' },
};

export function IssueDetailModal({ issue, onClose, onEdit }: IssueDetailModalProps) {
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [editingBehavior, setEditingBehavior] = useState(false);
  const [behaviorDraft, setBehaviorDraft] = useState(issue.behavior_example || '');
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const toast = useToast();

  // 댓글 조회
  const {
    data: comments,
    isLoading: loadingComments,
    mutate: mutateComments,
  } = useSWR<Comment[]>(`/api/issues/${issue.id}/comments`, fetcher);

  const handleAddComment = async () => {
    if (!newComment.trim() || submittingComment) return;
    setSubmittingComment(true);
    try {
      await fetcherWithOptions<Comment>(`/api/issues/${issue.id}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content: newComment.trim() }),
      });
      setNewComment('');
      mutateComments();
      toast.success('댓글이 추가되었습니다.');
    } catch {
      toast.error('댓글 추가에 실패했습니다.');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleSaveBehavior = async () => {
    try {
      await issueService.update(issue.id, { behavior_example: behaviorDraft });
      issue.behavior_example = behaviorDraft;
      setEditingBehavior(false);
      toast.success('동작 예시가 저장되었습니다.');
    } catch {
      toast.error('동작 예시 저장에 실패했습니다.');
    }
  };

  useEffect(() => {
    fetch(`/api/issues/${issue.id}/queue-items`)
      .then((res) => res.json())
      .then((data) => setQueueItems(data))
      .catch(() => setQueueItems([]))
      .finally(() => setLoadingHistory(false));
  }, [issue.id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3 min-w-0">
            <h3 className="text-base font-semibold text-gray-900 truncate">
              {issue.title}
            </h3>
            <Badge
              variant={issue.status === 'done' ? 'success' : issue.status === 'in_progress' ? 'info' : 'default'}
              size="sm"
            >
              {statusLabels[issue.status]}
            </Badge>
          </div>
          <div className="flex items-center gap-2 ml-3">
            <Button variant="secondary" size="sm" onClick={onEdit}>
              수정
            </Button>
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 본문 */}
        <div className="flex-1 overflow-y-auto">
          {/* 메타 정보 */}
          <div className="px-6 py-4 flex flex-wrap gap-4 text-xs text-gray-500 border-b border-gray-50">
            <span>
              우선순위: <Badge variant={issue.priority === 'high' ? 'danger' : issue.priority === 'medium' ? 'warning' : 'default'} size="sm">{priorityLabels[issue.priority]}</Badge>
            </span>
            {issue.repo_full_name && (
              <span className="flex items-center gap-1">
                <GitBranch className="w-3 h-3" />
                {issue.repo_full_name}
              </span>
            )}
            {issue.pr_url && (
              <div className="flex items-center gap-2">
                <a
                  href={issue.pr_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  PR 링크
                </a>
                {issue.pr_status && (
                  <Badge
                    variant={
                      issue.pr_status === 'merged' ? 'success'
                      : issue.pr_status === 'closed' ? 'danger'
                      : 'info'
                    }
                    size="sm"
                  >
                    {issue.pr_status === 'open' ? 'Open'
                      : issue.pr_status === 'merged' ? 'Merged'
                      : 'Closed'}
                  </Badge>
                )}
              </div>
            )}
            {issue.assignee && (
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" />
                담당자: {issue.assignee}
              </span>
            )}
            {issue.due_date && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                마감일: {new Date(issue.due_date).toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' })}
              </span>
            )}
            <span>생성: {formatRelativeTime(issue.created_at)}</span>
            <span>수정: {formatRelativeTime(issue.updated_at)}</span>
          </div>

          {/* 라벨 */}
          {issue.labels && issue.labels.length > 0 && (
            <div className="px-6 pt-3 flex flex-wrap gap-1.5">
              {issue.labels.map((label) => (
                <span
                  key={label.id}
                  className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
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

          {/* 설명 (마크다운) */}
          <div className="px-6 py-4">
            <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">설명</h4>
            {issue.description ? (
              <div className="prose prose-sm prose-gray max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {issue.description}
                </ReactMarkdown>
              </div>
            ) : (
              <p className="text-sm text-gray-400">설명이 없습니다.</p>
            )}
          </div>

          {/* 동작 예시 */}
          <div className="px-6 pb-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">동작 예시</h4>
              {!editingBehavior && (
                <button onClick={() => setEditingBehavior(true)} className="text-xs text-primary-600 hover:text-primary-700">
                  수정
                </button>
              )}
            </div>
            {editingBehavior ? (
              <div className="space-y-2">
                <textarea
                  value={behaviorDraft}
                  onChange={(e) => setBehaviorDraft(e.target.value)}
                  rows={6}
                  className="w-full text-sm text-gray-700 border border-gray-200 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 resize-none"
                  placeholder="에이전트에게 전달할 동작 예시를 입력하세요..."
                />
                <div className="flex gap-2 justify-end">
                  <button onClick={() => { setEditingBehavior(false); setBehaviorDraft(issue.behavior_example || ''); }} className="text-xs px-3 py-1 text-gray-600 hover:text-gray-800">
                    취소
                  </button>
                  <button onClick={handleSaveBehavior} className="text-xs px-3 py-1 bg-primary-600 text-white rounded hover:bg-primary-700">
                    저장
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-600 whitespace-pre-wrap">
                {issue.behavior_example || '동작 예시가 없습니다.'}
              </p>
            )}
          </div>

          {/* 작업 이력 타임라인 */}
          <div className="px-6 pb-6">
            <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">작업 이력</h4>
            {loadingHistory ? (
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <Loader2 className="w-3 h-3 animate-spin" />
                로딩 중...
              </div>
            ) : queueItems.length === 0 ? (
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <AlertCircle className="w-3 h-3" />
                작업 이력이 없습니다.
              </div>
            ) : (
              <div className="space-y-3">
                {queueItems.map((item) => {
                  const config = queueStatusConfig[item.status] || queueStatusConfig.pending;
                  const StatusIcon = config.icon;
                  return (
                    <div key={item.id} className="flex gap-3 items-start">
                      <StatusIcon className={clsx('w-4 h-4 mt-0.5 shrink-0', config.color)} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-medium text-gray-700">{config.label}</span>
                          <span className="text-gray-400">{formatRelativeTime(item.created_at)}</span>
                          {item.completed_at && (
                            <span className="text-gray-400">
                              → 완료 {formatRelativeTime(item.completed_at)}
                            </span>
                          )}
                        </div>
                        {item.result && (
                          <p className="text-xs text-gray-500 mt-1 line-clamp-3">{item.result}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 댓글 */}
          <div className="px-6 pb-6 border-t border-gray-100 pt-4">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">댓글</h4>

            {/* 댓글 목록 */}
            {loadingComments ? (
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <Loader2 className="w-3 h-3 animate-spin" />
                로딩 중...
              </div>
            ) : comments && comments.length > 0 ? (
              <div className="space-y-3">
                {comments.map((comment) => (
                  <div key={comment.id} className="p-3 bg-gray-50 rounded-md">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-700">{comment.author}</span>
                      <span className="text-[10px] text-gray-400">{formatRelativeTime(comment.created_at)}</span>
                    </div>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">{comment.content}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
                <AlertCircle className="w-3 h-3" />
                댓글이 없습니다.
              </div>
            )}

            {/* 댓글 입력 */}
            <div className="mt-3">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                rows={2}
                className="w-full text-sm border border-gray-200 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary-500 resize-none"
                placeholder="댓글을 입력하세요..."
              />
              <div className="flex justify-end mt-1">
                <button
                  onClick={handleAddComment}
                  disabled={!newComment.trim() || submittingComment}
                  className="text-xs px-3 py-1.5 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
                >
                  {submittingComment ? '추가 중...' : '댓글 추가'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
