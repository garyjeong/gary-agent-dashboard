'use client';

import { Sidebar } from '@/components/layout/Sidebar';

export default function GithubPage() {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center text-gray-600 space-y-1">
          <p className="text-sm font-semibold text-gray-900">GitHub 연동 페이지가 준비 중입니다.</p>
          <p className="text-sm text-gray-500">
            리포지토리 선택 기능은 곧 추가될 예정입니다.
          </p>
        </div>
      </div>
    </div>
  );
}
