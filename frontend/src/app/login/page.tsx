'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Github } from 'lucide-react';
import { useAuth } from '@/hooks';
import { Button } from '@/components/ui';

export default function LoginPage() {
  const router = useRouter();
  const { isLoggedIn, isLoading, login } = useAuth();

  useEffect(() => {
    if (!isLoading && isLoggedIn) {
      router.push('/');
    }
  }, [isLoggedIn, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-primary-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm mx-4">
        {/* 로고 */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Gary Dashboard</h1>
          <p className="text-sm text-gray-500 mt-2">
            에이전트 작업 관리 대시보드
          </p>
        </div>

        {/* 로그인 카드 */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 text-center mb-6">
            로그인
          </h2>

          <Button
            variant="secondary"
            size="lg"
            onClick={login}
            className="w-full justify-center"
          >
            <Github className="w-5 h-5" />
            GitHub로 계속하기
          </Button>

          <p className="text-xs text-gray-400 text-center mt-4">
            GitHub 계정으로 로그인하여 리포지토리에 접근합니다.
          </p>
        </div>
      </div>
    </div>
  );
}
