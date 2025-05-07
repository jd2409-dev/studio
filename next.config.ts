
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: true,
  },
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
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
  webpack: (config, { isServer, webpack }) => {
    // Ensure resolve.fallback exists
    if (!config.resolve) {
      config.resolve = {};
    }
    config.resolve.fallback = {
      ...(config.resolve.fallback || {}), // Spread existing fallbacks
    };

    // Exclude 'async_hooks' from being bundled for the browser
    if (!isServer) {
      config.resolve.fallback.async_hooks = false;
    }

    // Optional: Ignore warnings about Critical dependency: the request of a dependency is an expression
    // This can sometimes hide genuine issues, use with caution.
    // config.ignoreWarnings = [
    //   ...(config.ignoreWarnings || []),
    //   /Critical dependency: the request of a dependency is an expression/,
    // ];

    // Important: return the modified config
    return config;
  },
};

export default nextConfig;
