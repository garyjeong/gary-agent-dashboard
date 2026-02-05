'use client';

import { LayoutDashboard, ListTodo, Settings, GitBranch } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';

const navigation = [
  { name: '대시보드', href: '/', icon: LayoutDashboard },
  { name: '일감 목록', href: '/issues', icon: ListTodo },
  { name: 'GitHub 연동', href: '/github', icon: GitBranch },
  { name: '설정', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  
  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
      {/* 로고 */}
      <div className="h-16 flex items-center px-6 border-b border-gray-200">
        <h1 className="text-xl font-bold text-primary-600">Gary Dashboard</h1>
      </div>
      
      {/* 네비게이션 */}
      <nav className="flex-1 px-4 py-4 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={clsx(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>
      
      {/* 하단 정보 */}
      <div className="p-4 border-t border-gray-200">
        <p className="text-xs text-gray-500">Gary Agent Dashboard v0.1.0</p>
      </div>
    </aside>
  );
}
