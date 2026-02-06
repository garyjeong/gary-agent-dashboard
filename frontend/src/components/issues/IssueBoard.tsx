'use client';

import { useState, forwardRef, useImperativeHandle } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import useSWR from 'swr';
import { GitBranch } from 'lucide-react';
import { useIssues } from '@/hooks';
import { fetcher } from '@/lib/fetcher';
import { IssueColumn } from './IssueColumn';
import { IssueCard } from './IssueCard';
import { IssueModal } from './IssueModal';
import { IssueDetailModal } from './IssueDetailModal';
import { useToast } from '@/components/ui';
import { issueService } from '@/services/issueService';
import type { Issue, IssueStatus, IssueCreate, IssueUpdate } from '@/types';

const columns: { status: IssueStatus; title: string }[] = [
  { status: 'todo', title: 'To Do' },
  { status: 'in_progress', title: 'In Progress' },
  { status: 'done', title: 'Done' },
];

export interface IssueBoardRef {
  openCreateModal: () => void;
  refresh: () => void;
}

export const IssueBoard = forwardRef<IssueBoardRef>(function IssueBoard(_, ref) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const repoFilter = searchParams.get('repo') || undefined;

  const toast = useToast();
  const { data: repos } = useSWR<string[]>('/api/issues/repos', fetcher);
  const { issues, isLoading, mutate } = useIssues({ repo_full_name: repoFilter });
  const [modalOpen, setModalOpen] = useState(false);
  const [editingIssue, setEditingIssue] = useState<Issue | null>(null);
  const [activeIssue, setActiveIssue] = useState<Issue | null>(null);
  const [viewingIssue, setViewingIssue] = useState<Issue | null>(null);

  // 드래그 센서: 포인터(마우스) + 터치
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  );

  useImperativeHandle(ref, () => ({
    openCreateModal: () => setModalOpen(true),
    refresh: () => mutate(),
  }));

  const handleRepoChange = (repo: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (repo) {
      params.set('repo', repo);
    } else {
      params.delete('repo');
    }
    const query = params.toString();
    router.push(query ? `?${query}` : '/');
  };

  const handleCreate = async (data: IssueCreate | IssueUpdate) => {
    try {
      await issueService.create(data as IssueCreate);
      mutate();
      setModalOpen(false);
      toast.success('일감이 생성되었습니다.');
    } catch {
      toast.error('일감 생성에 실패했습니다.');
    }
  };

  const handleUpdate = async (id: number, data: IssueCreate | IssueUpdate) => {
    try {
      await issueService.update(id, data as IssueUpdate);
      mutate();
      setEditingIssue(null);
      toast.success('일감이 수정되었습니다.');
    } catch {
      toast.error('일감 수정에 실패했습니다.');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await issueService.delete(id);
      mutate();
      toast.success('일감이 삭제되었습니다.');
    } catch {
      toast.error('일감 삭제에 실패했습니다.');
    }
  };

  const handleWorkRequest = async (id: number) => {
    try {
      await issueService.createWorkRequest(id);
      toast.success('작업 요청이 큐에 등록되었습니다.');
      mutate();
    } catch {
      toast.error('작업 요청 등록에 실패했습니다.');
    }
  };

  const handleStatusChange = async (issue: Issue, newStatus: IssueStatus) => {
    try {
      await issueService.update(issue.id, { status: newStatus });
      mutate();
    } catch {
      toast.error('상태 변경에 실패했습니다.');
    }
  };

  // 드래그 시작
  const handleDragStart = (event: DragStartEvent) => {
    const issue = issues.find((i) => i.id === Number(event.active.id));
    setActiveIssue(issue ?? null);
  };

  // 드래그 종료 → 상태 변경
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveIssue(null);

    if (!over) return;

    const issueId = Number(active.id);
    const newStatus = String(over.id) as IssueStatus;
    const issue = issues.find((i) => i.id === issueId);

    if (!issue || issue.status === newStatus) return;

    try {
      await issueService.update(issueId, { status: newStatus });
      mutate();
    } catch {
      toast.error('상태 변경에 실패했습니다.');
    }
  };

  // 통계 계산
  const stats = {
    total: issues.length,
    todo: issues.filter((i) => i.status === 'todo').length,
    inProgress: issues.filter((i) => i.status === 'in_progress').length,
    done: issues.filter((i) => i.status === 'done').length,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-primary-600" />
      </div>
    );
  }

  return (
    <>
      {/* 통계 헤더 + 리포 필터 */}
      <div className="flex items-center justify-between gap-4 mb-6 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-900">전체</span>
            <span className="text-sm text-gray-500">{stats.total}</span>
          </div>
          <div className="h-4 w-px bg-gray-200" />
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span>
              <span className="inline-block w-2 h-2 rounded-full bg-gray-400 mr-1.5" />
              To Do {stats.todo}
            </span>
            <span>
              <span className="inline-block w-2 h-2 rounded-full bg-blue-500 mr-1.5" />
              In Progress {stats.inProgress}
            </span>
            <span>
              <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1.5" />
              Done {stats.done}
            </span>
          </div>
        </div>

        {/* 리포지토리 필터 */}
        {repos && repos.length > 0 && (
          <div className="flex items-center gap-1.5">
            <GitBranch className="w-3.5 h-3.5 text-gray-400" />
            <select
              value={repoFilter || ''}
              onChange={(e) => handleRepoChange(e.target.value)}
              className="text-xs text-gray-600 bg-white border border-gray-200 rounded-md px-2 py-1 pr-6 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">모든 리포지토리</option>
              {repos.map((repo) => (
                <option key={repo} value={repo}>
                  {repo}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* 칸반 보드 (DnD) */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 lg:gap-6 h-full overflow-x-auto pb-4">
          {columns.map((column) => (
            <IssueColumn
              key={column.status}
              title={column.title}
              status={column.status}
              issues={issues.filter((issue) => issue.status === column.status)}
              onView={setViewingIssue}
              onEdit={setEditingIssue}
              onDelete={handleDelete}
              onWorkRequest={handleWorkRequest}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>

        {/* 드래그 오버레이 (드래그 중 표시되는 카드) */}
        <DragOverlay>
          {activeIssue ? (
            <div className="opacity-90 shadow-lg rotate-2">
              <IssueCard
                issue={activeIssue}
                onEdit={() => {}}
                onDelete={() => {}}
                onWorkRequest={() => {}}
                onStatusChange={() => {}}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* 생성 모달 */}
      {modalOpen && (
        <IssueModal
          onClose={() => setModalOpen(false)}
          onSubmit={handleCreate}
        />
      )}

      {/* 수정 모달 */}
      {editingIssue && (
        <IssueModal
          issue={editingIssue}
          onClose={() => setEditingIssue(null)}
          onSubmit={(data) => handleUpdate(editingIssue.id, data)}
        />
      )}

      {/* 상세 보기 모달 */}
      {viewingIssue && (
        <IssueDetailModal
          issue={viewingIssue}
          onClose={() => setViewingIssue(null)}
          onEdit={() => {
            setViewingIssue(null);
            setEditingIssue(viewingIssue);
          }}
        />
      )}
    </>
  );
});
