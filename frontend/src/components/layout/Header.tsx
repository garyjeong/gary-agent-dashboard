'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Plus, RefreshCw, LogOut, Menu, Search, ChevronDown } from 'lucide-react';
import Image from 'next/image';
import { useAuth } from '@/hooks';
import { Button } from '@/components/ui';
import { clsx } from 'clsx';

interface HeaderProps {
  title?: string;
  onCreateClick?: () => void;
  onRefresh?: () => void;
  onMenuClick?: () => void;
}

export function Header({ title = '일감 관리', onCreateClick, onRefresh, onMenuClick }: HeaderProps) {
  const { user, logout } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleRefresh = useCallback(() => {
    onRefresh?.();
  }, [onRefresh]);

  // 외부 클릭 시 메뉴 닫기
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6 flex-shrink-0">
      {/* 좌측: 메뉴 + 타이틀 */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md lg:hidden transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h2 className="text-[15px] font-semibold text-gray-900">{title}</h2>
      </div>

      {/* 우측: 액션들 */}
      <div className="flex items-center gap-1.5">
        {/* 새로고침 */}
        <button
          onClick={handleRefresh}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
          title="새로고침"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        {/* 일감 생성 */}
        {onCreateClick && (
          <Button
            variant="primary"
            size="sm"
            onClick={onCreateClick}
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">새 일감</span>
          </Button>
        )}

        {/* 구분선 */}
        <div className="w-px h-6 bg-gray-200 mx-1.5" />

        {/* 유저 메뉴 */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2 p-1.5 rounded-md hover:bg-gray-100 transition-colors"
          >
            {user?.github_avatar_url ? (
              <Image
                src={user.github_avatar_url}
                alt={user.github_login || ''}
                width={28}
                height={28}
                className="rounded-full"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center">
                <span className="text-xs font-medium text-gray-500">
                  {user?.github_login?.charAt(0).toUpperCase() || '?'}
                </span>
              </div>
            )}
            <span className="hidden md:block text-sm text-gray-700 font-medium max-w-[120px] truncate">
              {user?.github_login || 'User'}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400 hidden md:block" />
          </button>

          {/* 드롭다운 */}
          {userMenuOpen && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50">
              {user && (
                <div className="px-3 py-2 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {user.github_name || user.github_login}
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    @{user.github_login}
                  </p>
                </div>
              )}
              <button
                onClick={() => {
                  setUserMenuOpen(false);
                  logout();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                로그아웃
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
