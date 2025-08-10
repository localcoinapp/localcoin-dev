
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Keep the existing allowedDevOrigins for your development and local environments
  allowedDevOrigins: [
    "https://3000-firebase-studio-1754307110114.cluster-6vyo4gb53jczovun3dxslzjahs.cloudworkstations.dev",
    "http://localhost:3000",
    "https://6000-firebase-studio-1754307110114.cluster-6vyo4gb53jczovun3dxslzjahs.cloudworkstations.dev"
  ],
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/_next/image',
        destination: '/_next/image',
      },
      {
        source: '/:path*',
        destination: 'http://localhost:9000/:path*',
      },
    ];
  },
  // Add the experimental.allowedDevOrigins for the prototype view
  experimental: {
    allowedDevOrigins: [
      'https://6000-firebase-studio-1754307110114.cluster-6vyo4gb53jczovun3dxslzjahs.cloudworkstations.dev',
      'https://9000-firebase-studio-1754307110114.cluster-6vyo4gb53jczovun3dxslzjahs.cloudworkstations.dev', // Also add the code view origin just in case
    ],
  },
};

// Forcing a server restart to clear the cache.
export default nextConfig;
