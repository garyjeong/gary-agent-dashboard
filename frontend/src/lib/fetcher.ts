/**
 * SWR용 fetcher 함수
 */

export class ApiError extends Error {
  status: number;
  
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url);
  
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: '요청 실패' }));
    throw new ApiError(error.detail || '요청 실패', res.status);
  }
  
  return res.json();
}

export async function fetcherWithOptions<T>(
  url: string,
  options: RequestInit,
): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: '요청 실패' }));
    throw new ApiError(error.detail || '요청 실패', res.status);
  }
  
  // 204 No Content
  if (res.status === 204) {
    return undefined as T;
  }
  
  return res.json();
}
