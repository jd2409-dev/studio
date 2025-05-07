
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
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
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      { // Add vercel avatar hostname
        protocol: 'https',
        hostname: 'avatar.vercel.sh',
        port: '',
        pathname: '/**',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Prevent Node.js specific modules like 'async_hooks' from being bundled for the client
      config.resolve.fallback = {
        ...config.resolve.fallback,
        async_hooks: false, // Tell Webpack to ignore 'async_hooks' on the client
      };
    }
    // Important: return the modified config
    return config;
  },
};

export default nextConfig;
