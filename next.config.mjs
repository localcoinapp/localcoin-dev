/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
      },
    ],
    // Allow serving local images via an API route
    path: '/_next/image',
    loader: 'default',
    // This allows relative paths for our local file-serving API
    // It tells Next.js that any src starting with /api/uploads/ is a valid image source
    domains: [], // The domains array is deprecated, but let's keep it for compatibility
    unoptimized: false,
  },
  // This rewrites rule is a robust way to ensure the image optimizer can handle our API routes
  async rewrites() {
    return [
      {
        source: '/api/uploads/:path*',
        destination: '/api/uploads/:path*',
      },
    ]
  },
};

export default nextConfig;
