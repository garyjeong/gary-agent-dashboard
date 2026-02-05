'use client';

import { useState } from 'react';
import { useIssues } from '@/hooks';
import { IssueColumn } from './IssueColumn';
import { IssueModal } from './IssueModal';
import { issueService } from '@/services/issueService';
import type { Issue, IssueStatus, IssueCreate, IssueUpdate } from '@/types';

const columns: { status: IssueStatus; title: string; color: string }[] = [
  { status: 'todo', title: 'To Do', color: 'bg-gray-100' },
  { status: 'in_progress', title: 'In Progress', color: 'bg-blue-100' },
  { status: 'done', title: 'Done', color: 'bg-green-100' },
];

export function IssueBoard() {
  const { issues, isLoading, mutate } = useIssues();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingIssue, setEditingIssue] = useState<Issue | null>(null);
  
  const handleCreate = async (data: IssueCreate) => {
    await issueService.create(data);
    mutate();
    setModalOpen(false);
  };
  
  const handleUpdate = async (id: number, data: IssueUpdate) => {
    await issueService.update(id, data);
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
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }
  
  return (
    <>
      <div className="flex gap-6 h-full">
        {columns.map((column) => (
          <IssueColumn
            key={column.status}
            title={column.title}
            color={column.color}
            issues={issues.filter((issue) => issue.status === column.status)}
            onEdit={setEditingIssue}
            onDelete={handleDelete}
            onWorkRequest={handleWorkRequest}
            onStatusChange={handleStatusChange}
          />
        ))}
      </div>
      
      {/* 생성 버튼 (플로팅) */}
      <button
        onClick={() => setModalOpen(true)}
        className="fixed bottom-8 right-8 w-14 h-14 bg-primary-600 text-white rounded-full shadow-lg hover:bg-primary-700 transition-colors flex items-center justify-center text-2xl"
      >
        +
      </button>
      
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
}
