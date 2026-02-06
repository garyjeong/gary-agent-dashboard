'use client';

import { useState, forwardRef, useImperativeHandle } from 'react';
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
import { useIssues } from '@/hooks';
import { IssueColumn } from './IssueColumn';
import { IssueCard } from './IssueCard';
import { IssueModal } from './IssueModal';
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
  const { issues, isLoading, mutate } = useIssues();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingIssue, setEditingIssue] = useState<Issue | null>(null);
  const [activeIssue, setActiveIssue] = useState<Issue | null>(null);

  // 드래그 센서: 포인터(마우스) + 터치
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  );

  useImperativeHandle(ref, () => ({
    openCreateModal: () => setModalOpen(true),
    refresh: () => mutate(),
  }));

  const handleCreate = async (data: IssueCreate | IssueUpdate) => {
    await issueService.create(data as IssueCreate);
    mutate();
    setModalOpen(false);
  };

  const handleUpdate = async (id: number, data: IssueCreate | IssueUpdate) => {
    await issueService.update(id, data as IssueUpdate);
    mutate();
    setEditingIssue(null);
  };

  const handleDelete = async (id: number) => {
    if (confirm('정말 삭제하시겠습니까?')) {
      await issueService.delete(id);
      mutate();
    }
  };

  const handleWorkRequest = async (id: number) => {
    await issueService.createWorkRequest(id);
    alert('작업 요청이 큐에 등록되었습니다.');
    mutate();
  };

  const handleStatusChange = async (issue: Issue, newStatus: IssueStatus) => {
    await issueService.update(issue.id, { status: newStatus });
    mutate();
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

    // 상태 변경
    await issueService.update(issueId, { status: newStatus });
    mutate();
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
      {/* 통계 헤더 */}
      <div className="flex items-center gap-4 mb-6 pb-4 border-b border-gray-100">
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
    </>
  );
});
