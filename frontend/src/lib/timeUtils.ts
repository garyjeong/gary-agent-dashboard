/**
 * 상대 시간을 포맷팅합니다.
 * @param dateString - ISO 8601 형식의 날짜 문자열
 * @returns "방금 전", "5분 전", "2시간 전", "3일 전" 등
 */
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);

  if (diffSeconds < 60) {
    return '방금 전';
  }
  if (diffMinutes < 60) {
    return `${diffMinutes}분 전`;
  }
  if (diffHours < 24) {
    return `${diffHours}시간 전`;
  }
  if (diffDays < 7) {
    return `${diffDays}일 전`;
  }
  if (diffWeeks < 4) {
    return `${diffWeeks}주 전`;
  }
  if (diffMonths < 12) {
    return `${diffMonths}개월 전`;
  }

  const diffYears = Math.floor(diffMonths / 12);
  return `${diffYears}년 전`;
}

/**
 * 날짜를 짧은 형식으로 포맷팅합니다.
 * @param dateString - ISO 8601 형식의 날짜 문자열
 * @returns "1월 15일", "12월 31일" 등
 */
export function formatShortDate(dateString: string): string {
  const date = new Date(dateString);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${month}월 ${day}일`;
}
