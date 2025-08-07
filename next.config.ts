
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  allowedDevOrigins: ["https://3000-firebase-studio-1754307110114.cluster-6vyo4gb53jczovun3dxslzjahs.cloudworkstations.dev", "http://localhost:3000"],
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
};

// Forcing a server restart to clear the cache.
export default nextConfig;
