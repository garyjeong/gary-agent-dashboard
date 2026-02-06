'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/hooks';

/** GitHub 공식 마크 (Octicon) */
function GitHubMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

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
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-200 border-t-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white px-4">
      <div className="w-full max-w-[320px] flex flex-col items-center">
        {/* 로고 */}
        <div className="mb-8">
          <Image src="/logo.svg" alt="Gary" width={72} height={72} priority />
        </div>

        {/* 타이틀 */}
        <h1
          className="text-[22px] font-semibold text-gray-900 mb-1.5 tracking-tight"
          style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
        >
          Gary Dashboard
        </h1>
        <p className="text-[13px] text-gray-400 mb-10">
          에이전트 작업 관리 플랫폼에 로그인
        </p>

        {/* GitHub 공식 스타일 버튼 */}
        <button
          onClick={login}
          className="w-full h-10 flex items-center justify-center gap-2 rounded-md text-[14px] font-medium text-white transition-all duration-150 shadow-sm hover:brightness-110 active:brightness-95"
          style={{ backgroundColor: '#24292f' }}
        >
          <GitHubMark className="w-5 h-5" />
          Sign in with GitHub
        </button>

        {/* 권한 안내 */}
        <div className="mt-6 w-full rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
          <p className="text-[11px] font-medium text-gray-500 mb-2">요청되는 권한</p>
          <ul className="space-y-1.5">
            <li className="flex items-start gap-2 text-[11px] text-gray-400">
              <span className="w-1 h-1 rounded-full bg-gray-300 mt-1.5 flex-shrink-0" />
              <span><span className="text-gray-500">public_repo</span> — 공개 리포지토리 읽기/쓰기</span>
            </li>
            <li className="flex items-start gap-2 text-[11px] text-gray-400">
              <span className="w-1 h-1 rounded-full bg-gray-300 mt-1.5 flex-shrink-0" />
              <span><span className="text-gray-500">read:user</span> — 프로필 정보 읽기 전용</span>
            </li>
          </ul>
          <p className="text-[10px] text-gray-300 mt-2">
            비공개 리포지토리에는 접근하지 않습니다.
          </p>
        </div>
      </div>

      {/* 푸터 */}
      <p className="absolute bottom-6 text-[11px] text-gray-300">
        Gary Agent Dashboard
      </p>
    </div>
  );
}
