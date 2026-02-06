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

async function tryRefreshToken(): Promise<boolean> {
  try {
    const res = await fetch('/api/auth/refresh', { method: 'POST' });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetcher<T>(url: string): Promise<T> {
  let res = await fetch(url);

  // 401이면 토큰 갱신 후 재시도
  if (res.status === 401 && url !== '/api/auth/me') {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      res = await fetch(url);
    }
  }

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
  const fetchOpts = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };

  let res = await fetch(url, fetchOpts);

  // 401이면 토큰 갱신 후 재시도
  if (res.status === 401) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      res = await fetch(url, fetchOpts);
    }
  }

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
