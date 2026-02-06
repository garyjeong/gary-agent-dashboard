/** @type {import('next').NextConfig} */
const nextConfig = {
  // Docker 배포용 standalone 빌드
  output: 'standalone',

  // GitHub 아바타 등 외부 이미지 허용
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
    ],
  },

  // API 프록시 (개발 환경에서 CORS 우회)
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    return [
      {
        source: '/api/:path*',
        destination: `${apiUrl}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
