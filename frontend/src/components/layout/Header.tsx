'use client';

import { Plus, RefreshCw, LogIn, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks';

interface HeaderProps {
  onCreateClick?: () => void;
  onRefresh?: () => void;
}

export function Header({ onCreateClick, onRefresh }: HeaderProps) {
  const { user, isLoggedIn, login, logout } = useAuth();
  
  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">일감 관리</h2>
        <p className="text-sm text-gray-500">작업을 관리하고 에이전트에게 요청하세요</p>
      </div>
      
      <div className="flex items-center gap-3">
        <button
          onClick={onRefresh}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          title="새로고침"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
        
        <button
          onClick={onCreateClick}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium text-sm"
        >
          <Plus className="w-4 h-4" />
          일감 생성
        </button>
        
        {/* GitHub 로그인/로그아웃 */}
        {isLoggedIn ? (
          <div className="flex items-center gap-2">
            {user?.github_avatar_url && (
              <img
                src={user.github_avatar_url}
                alt={user.github_login}
                className="w-8 h-8 rounded-full"
              />
            )}
            <span className="text-sm text-gray-700">{user?.github_login}</span>
            <button
              onClick={logout}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="로그아웃"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <button
            onClick={login}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors font-medium text-sm"
          >
            <LogIn className="w-4 h-4" />
            GitHub 로그인
          </button>
        )}
      </div>
    </header>
  );
}
