'use client';

import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
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
import clsx from 'clsx';
import { GitBranch, Search } from 'lucide-react';
import { useIssues, useLabels } from '@/hooks';
import { useFilterStore } from '@/lib/store';
import { fetcher } from '@/lib/fetcher';
import { IssueColumn } from './IssueColumn';
import { IssueCard } from './IssueCard';
import { IssueModal } from './IssueModal';
import { CreateIssueModal } from './CreateIssueModal';
import { IssueDetailModal } from './IssueDetailModal';
import { useToast, Pagination } from '@/components/ui';
import { issueService } from '@/services/issueService';
import type { Issue, IssueStatus, IssueCreate, IssueUpdate } from '@/types';

const columns: { status: IssueStatus; title: string }[] = [
  { status: 'todo', title: 'To Do' },
  { status: 'in_progress', title: 'In Progress' },
  { status: 'done', title: 'Done' },
];

const ITEMS_PER_PAGE = 20;

export interface IssueBoardRef {
  openCreateModal: () => void;
  refresh: () => void;
}

export const IssueBoard = forwardRef<IssueBoardRef>(function IssueBoard(_, ref) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { repo, search, setRepo, setSearch } = useFilterStore();
  const pageParam = searchParams.get('page');
  const [page, setPage] = useState(pageParam ? Number(pageParam) : 1);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Sync URL -> store on mount and when URL params change externally
  useEffect(() => {
    const urlRepo = searchParams.get('repo') || undefined;
    const urlSearch = searchParams.get('q') || '';
    if (urlRepo !== repo) setRepo(urlRepo);
    if (urlSearch !== search) setSearch(urlSearch);
  }, [searchParams]);

  // Sync store search -> URL (debounced)
  useEffect(() => {
    debounceRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (search) {
        params.set('q', search);
      } else {
        params.delete('q');
      }
      const query = params.toString();
      router.replace(query ? `?${query}` : '/');
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [search]);

  const toast = useToast();
  const { data: repos } = useSWR<string[]>('/api/issues/repos', fetcher);
  const { labels } = useLabels();
  const [selectedLabels, setSelectedLabels] = useState<number[]>([]);

  const { issues, total, isLoading, mutate } = useIssues({
    repo_full_name: repo,
    search: search || undefined,
    label_ids: selectedLabels.length > 0 ? selectedLabels : undefined,
    page,
    limit: ITEMS_PER_PAGE,
  });

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    const params = new URLSearchParams(searchParams.toString());
    if (newPage > 1) {
      params.set('page', String(newPage));
    } else {
      params.delete('page');
    }
    const query = params.toString();
    router.replace(query ? `?${query}` : '/');
  };

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [search, repo, selectedLabels]);

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

  const handleRepoChange = (newRepo: string) => {
    const repoValue = newRepo || undefined;
    setRepo(repoValue);
    const params = new URLSearchParams(searchParams.toString());
    if (newRepo) {
      params.set('repo', newRepo);
    } else {
      params.delete('repo');
    }
    const query = params.toString();
    router.push(query ? `?${query}` : '/');
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
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

  // 드래그 종료 → 상태 변경 (낙관적 업데이트)
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveIssue(null);

    if (!over) return;

    const issueId = Number(active.id);
    const newStatus = String(over.id) as IssueStatus;
    const issue = issues.find((i) => i.id === issueId);

    if (!issue || issue.status === newStatus) return;

    // 낙관적 업데이트: 로컬 캐시를 즉시 갱신
    const optimisticData = {
      items: issues.map((i) =>
        i.id === issueId ? { ...i, status: newStatus } : i
      ),
      total,
    };
    mutate(optimisticData, false);

    try {
      await issueService.update(issueId, { status: newStatus });
      // 서버 응답으로 캐시 재검증
      mutate();
    } catch {
      // 실패 시 서버 데이터로 롤백
      mutate();
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
      <>
        {/* 스켈레톤 통계 헤더 */}
        <div className="flex items-center gap-4 mb-6 pb-4 border-b border-gray-100">
          <div className="h-4 w-20 bg-gray-100 rounded animate-pulse" />
          <div className="h-4 w-32 bg-gray-100 rounded animate-pulse" />
        </div>
        {/* 스켈레톤 칸반 보드 */}
        <div className="flex gap-4 lg:gap-6">
          {[1, 2, 3].map((col) => (
            <div key={col} className="flex-1 min-w-[280px] max-w-[360px]">
              <div className="flex items-center gap-2 px-1 py-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-gray-200 animate-pulse" />
                <div className="h-4 w-20 bg-gray-100 rounded animate-pulse" />
              </div>
              {[1, 2, 3].map((card) => (
                <div key={card} className="bg-white rounded-md border border-gray-200 p-4 mb-2 space-y-3">
                  <div className="h-3 w-24 bg-gray-100 rounded animate-pulse" />
                  <div className="h-4 w-full bg-gray-100 rounded animate-pulse" />
                  <div className="h-3 w-3/4 bg-gray-50 rounded animate-pulse" />
                  <div className="flex justify-between items-center">
                    <div className="h-5 w-12 bg-gray-100 rounded-full animate-pulse" />
                    <div className="h-3 w-16 bg-gray-50 rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </>
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

        {/* 검색 + 리포 필터 */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="검색..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-7 pr-3 py-1 text-xs text-gray-600 bg-white border border-gray-200 rounded-md w-40 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        {repos && repos.length > 0 && (
          <div className="flex items-center gap-1.5">
            <GitBranch className="w-3.5 h-3.5 text-gray-400" />
            <select
              value={repo || ''}
              onChange={(e) => handleRepoChange(e.target.value)}
              className="text-xs text-gray-600 bg-white border border-gray-200 rounded-md px-2 py-1 pr-6 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">모든 리포지토리</option>
              {repos.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
        )}
        </div>
      </div>

      {/* 라벨 필터 */}
      {labels && labels.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap mb-4">
          {labels.map((label) => (
            <button
              key={label.id}
              onClick={() => {
                setSelectedLabels((prev) =>
                  prev.includes(label.id)
                    ? prev.filter((id) => id !== label.id)
                    : [...prev, label.id]
                );
              }}
              className={clsx(
                'inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-medium border transition-colors cursor-pointer',
                selectedLabels.includes(label.id)
                  ? 'opacity-100'
                  : 'opacity-40 hover:opacity-70'
              )}
              style={{
                backgroundColor: selectedLabels.includes(label.id) ? `${label.color}20` : 'transparent',
                color: label.color,
                borderColor: `${label.color}50`,
              }}
            >
              {label.name}
            </button>
          ))}
        </div>
      )}

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

      {/* 페이지네이션 */}
      <Pagination currentPage={page} totalPages={totalPages} onPageChange={handlePageChange} />

      {/* 생성 모달 */}
      <CreateIssueModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleCreate}
      />

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
