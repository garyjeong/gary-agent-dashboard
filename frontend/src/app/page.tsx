'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { IssueBoard, IssueBoardRef } from '@/components/issues/IssueBoard';
import { useAuth } from '@/hooks';

export default function Home() {
  const router = useRouter();
  const { isLoggedIn, isLoading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const issueBoardRef = useRef<IssueBoardRef>(null);

  useEffect(() => {
    if (!isLoading && !isLoggedIn) {
      router.push('/login');
    }
  }, [isLoggedIn, isLoading, router]);

  if (isLoading || !isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-primary-600" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          onMenuClick={() => setSidebarOpen(true)}
          onCreateClick={() => issueBoardRef.current?.openCreateModal()}
          onRefresh={() => issueBoardRef.current?.refresh()}
        />
        <main className="flex-1 overflow-auto p-4 lg:p-6">
          <Suspense fallback={
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-primary-600" />
            </div>
          }>
            <IssueBoard ref={issueBoardRef} />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
