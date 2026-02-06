/**
 * API 에러 응답 타입 정의
 */

export interface ApiError {
  detail: string;
  code?: string;
}

export interface QueueError extends ApiError {
  item_id?: number;
}

export interface ValidationError {
  detail: Array<{
    loc: (string | number)[];
    msg: string;
    type: string;
  }>;
}
