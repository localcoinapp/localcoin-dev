/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: [
    "https://3000-firebase-studio-1754307110114.cluster-6vyo4gb53jczovun3dxslzjahs.cloudworkstations.dev",
    "http://localhost:3000",
    "https://6000-firebase-studio-1754307110114.cluster-6vyo4gb53jczovun3dxslzjahs.cloudworkstations.dev",
    'https://9000-firebase-studio-1754307110114.cluster-6vyo4gb53jczovun3dxslzjahs.cloudworkstations.dev',
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
       {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
      },
    ],
  },
  async rewrites() {
    return [
       // This rule will proxy requests from /firebase-storage/... to the actual Firebase Storage API.
      {
        source: '/firebase-storage/:path*',
        destination: 'https://firebasestorage.googleapis.com/:path*',
      },
    ];
  },
};

export default nextConfig;
