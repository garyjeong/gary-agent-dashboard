'use client';

import { Plus, RefreshCw, LogOut, Menu } from 'lucide-react';
import { useAuth } from '@/hooks';
import { Button } from '@/components/ui';

interface HeaderProps {
  title?: string;
  onCreateClick?: () => void;
  onRefresh?: () => void;
  onMenuClick?: () => void;
}

export function Header({ title = '일감 관리', onCreateClick, onRefresh, onMenuClick }: HeaderProps) {
  const { logout } = useAuth();

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

        <Button variant="ghost" size="sm" onClick={onRefresh} className="w-8 h-8 p-0">
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
