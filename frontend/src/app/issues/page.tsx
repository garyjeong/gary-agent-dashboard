'use client';

import { Sidebar } from '@/components/layout/Sidebar';

export default function IssuesPage() {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center text-gray-600 space-y-1">
          <p className="text-sm font-semibold text-gray-900">일감 페이지가 준비 중입니다.</p>
          <p className="text-sm text-gray-500">
            현재는 대시보드 홈에서 칸반 보드로 일감을 관리하세요.
          </p>
        </div>
      </div>
    </div>
  );
}
