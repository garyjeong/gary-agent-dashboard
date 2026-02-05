/**
 * 인증 관련 타입
 */

export interface User {
  id: number;
  github_id: number;
  github_login: string;
  github_name: string | null;
  github_avatar_url: string | null;
}

export interface AuthURLResponse {
  url: string;
}
