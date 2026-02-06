import { create } from 'zustand';
import type { IssueStatus, IssuePriority } from '@/types';

interface FilterState {
  repo: string | undefined;
  search: string;
  status: IssueStatus | undefined;
  priority: IssuePriority | undefined;
  setRepo: (repo: string | undefined) => void;
  setSearch: (search: string) => void;
  setStatus: (status: IssueStatus | undefined) => void;
  setPriority: (priority: IssuePriority | undefined) => void;
  reset: () => void;
}

export const useFilterStore = create<FilterState>((set) => ({
  repo: undefined,
  search: '',
  status: undefined,
  priority: undefined,
  setRepo: (repo) => set({ repo }),
  setSearch: (search) => set({ search }),
  setStatus: (status) => set({ status }),
  setPriority: (priority) => set({ priority }),
  reset: () => set({ repo: undefined, search: '', status: undefined, priority: undefined }),
}));
