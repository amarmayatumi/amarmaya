/** @type {import('next').NextConfig} */
const nextConfig = {
  trailingSlash: true,
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          { key: 'Service-Worker-Allowed', value: '/' },
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
        ],
      },
      {
        source: '/manifest.json',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=60' },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      { source: '/index.html', destination: '/' },
      { source: '/index.php', destination: '/' },
    ];
  },
};

export default nextConfig;
