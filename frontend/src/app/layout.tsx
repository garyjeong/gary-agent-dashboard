import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from './providers';

export const viewport: Viewport = {
  themeColor: '#6366F1',
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  title: {
    default: 'Gary Agent Dashboard',
    template: '%s | Gary Dashboard',
  },
  description: 'AI 에이전트 기반 스마트 작업 관리 플랫폼 — GitHub 연동, 칸반 보드, 에이전트 작업 큐',
  keywords: ['dashboard', 'agent', 'task management', 'github', 'kanban'],
  authors: [{ name: 'Gary' }],
  icons: {
    icon: [
      { url: '/logo.svg', type: 'image/svg+xml' },
      { url: '/logo-192.svg', sizes: '192x192', type: 'image/svg+xml' },
    ],
    apple: { url: '/logo-192.svg', sizes: '192x192', type: 'image/svg+xml' },
  },
  manifest: '/manifest.json',
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    siteName: 'Gary Agent Dashboard',
    title: 'Gary Agent Dashboard',
    description: 'AI 에이전트 기반 스마트 작업 관리 플랫폼',
    images: [
      {
        url: '/og-image.svg',
        width: 1200,
        height: 630,
        alt: 'Gary Agent Dashboard',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Gary Agent Dashboard',
    description: 'AI 에이전트 기반 스마트 작업 관리 플랫폼',
    images: ['/og-image.svg'],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Gary Dashboard',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="font-sans">
        <Providers>
          <div className="min-h-screen bg-gray-50">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
