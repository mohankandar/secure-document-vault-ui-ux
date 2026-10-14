/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Dev-only: proxies the real Vite app (served by the local harness on :5199) into the v0 preview at /__real/.
  async rewrites() {
    if (process.env.NODE_ENV !== 'development') return []
    return [
      { source: '/__real', destination: 'http://localhost:5199/__real/' },
      { source: '/__real/:path*', destination: 'http://localhost:5199/__real/:path*' },
      { source: '/api/v1/:path*', destination: 'http://localhost:5199/api/v1/:path*' },
    ]
  },
}

export default nextConfig
