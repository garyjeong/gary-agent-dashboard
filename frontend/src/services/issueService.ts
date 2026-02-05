/**
 * 일감 API 서비스
 */

import { fetcherWithOptions } from '@/lib/fetcher';
import type { Issue, IssueCreate, IssueUpdate, IssueListResponse } from '@/types';

const API_BASE = '/api/issues';

export const issueService = {
  /**
   * 일감 목록 조회
   */
  async getList(params?: {
    status?: string;
    priority?: string;
    repo_full_name?: string;
    skip?: number;
    limit?: number;
  }): Promise<IssueListResponse> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.priority) searchParams.set('priority', params.priority);
    if (params?.repo_full_name) searchParams.set('repo_full_name', params.repo_full_name);
    if (params?.skip) searchParams.set('skip', String(params.skip));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    
    const query = searchParams.toString();
    const url = query ? `${API_BASE}?${query}` : API_BASE;
    
    const res = await fetch(url);
    return res.json();
  },

  /**
   * 일감 상세 조회
   */
  async getById(id: number): Promise<Issue> {
    const res = await fetch(`${API_BASE}/${id}`);
    return res.json();
  },

  /**
   * 일감 생성
   */
  async create(data: IssueCreate): Promise<Issue> {
    return fetcherWithOptions<Issue>(API_BASE, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * 일감 수정
   */
  async update(id: number, data: IssueUpdate): Promise<Issue> {
    return fetcherWithOptions<Issue>(`${API_BASE}/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  /**
   * 일감 삭제
   */
  async delete(id: number): Promise<void> {
    await fetcherWithOptions<void>(`${API_BASE}/${id}`, {
      method: 'DELETE',
    });
  },

  /**
   * 작업 요청 생성
   */
  async createWorkRequest(id: number): Promise<void> {
    await fetcherWithOptions<void>(`${API_BASE}/${id}/work-request`, {
      method: 'POST',
    });
  },
};
