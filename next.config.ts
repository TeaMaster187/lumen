import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // In production, proxy /socket.io/ requests to the chat-service on port 3003.
  // In dev, the z.ai dev proxy uses XTransformPort instead, so we skip the rewrite.
  async rewrites() {
    if (process.env.NODE_ENV !== 'production') return []
    return [
      {
        source: '/socket.io/:path*',
        destination: 'http://localhost:3003/socket.io/:path*',
      },
    ]
  },
};

export default nextConfig;
