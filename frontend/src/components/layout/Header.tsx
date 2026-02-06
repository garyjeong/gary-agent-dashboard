'use client';

import { useState, useCallback, useEffect } from 'react';
import { Plus, RefreshCw, LogOut, Menu } from 'lucide-react';
import { useAuth } from '@/hooks';
import { Button } from '@/components/ui';

function formatLastUpdated(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 5) return '방금 전';
  if (diffSec < 60) return `${diffSec}초 전`;

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}분 전`;

  return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
}

interface HeaderProps {
  title?: string;
  onCreateClick?: () => void;
  onRefresh?: () => void;
  onMenuClick?: () => void;
}

export function Header({ title = '일감 관리', onCreateClick, onRefresh, onMenuClick }: HeaderProps) {
  const { logout } = useAuth();
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [, setTick] = useState(0);

  // 새로고침 시 타임스탬프 갱신
  const handleRefresh = useCallback(() => {
    onRefresh?.();
    setLastUpdated(new Date());
  }, [onRefresh]);

  // 상대 시간 표시를 위해 주기적으로 리렌더링 (30초 간격)
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-14 bg-white border-b border-gray-100 flex items-center justify-between px-4 lg:px-6">
      {/* 좌측: 메뉴 버튼 + 타이틀 */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h2 className="text-sm font-medium text-gray-900">{title}</h2>
      </div>

      {/* 우측: 액션 버튼들 */}
      <div className="flex items-center gap-2">
        <Button
          variant="primary"
          size="sm"
          onClick={onCreateClick}
          className="hidden sm:flex"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden md:inline">일감 생성</span>
        </Button>

        {/* 모바일에서 + 버튼만 */}
        <Button
          variant="primary"
          size="sm"
          onClick={onCreateClick}
          className="sm:hidden w-8 h-8 p-0"
        >
          <Plus className="w-4 h-4" />
        </Button>

        <span className="hidden sm:inline text-xs text-gray-400">
          마지막 업데이트: {formatLastUpdated(lastUpdated)}
        </span>

        <Button variant="ghost" size="sm" onClick={handleRefresh} className="w-8 h-8 p-0">
          <RefreshCw className="w-4 h-4" />
        </Button>

        <div className="ml-2 pl-2 border-l border-gray-200">
          <Button variant="ghost" size="sm" onClick={logout} className="w-8 h-8 p-0">
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
