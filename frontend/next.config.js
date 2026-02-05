/** @type {import('next').NextConfig} */
const nextConfig = {
  // Docker 배포용 standalone 빌드
  output: 'standalone',

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
