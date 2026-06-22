/** @type {import('next').NextConfig} */
const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const nextConfig = {
  images: { remotePatterns: [{ protocol: 'https', hostname: '**' }] },
  async rewrites() {
    if (process.env.NODE_ENV === 'production') return [];
    return [
      { source: '/api/:path*', destination: `${apiUrl}/api/:path*` },
      { source: '/uploads/:path*', destination: `${apiUrl}/uploads/:path*` },
    ];
  },
};

module.exports = nextConfig;
