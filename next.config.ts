
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: false,
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
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
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },

  // Exclude server-only packages from client bundle
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Don't bundle these server-only packages on the client
      config.resolve.alias = {
        ...config.resolve.alias,
        'firebase-admin': false,
        'firebase-admin/auth': false,
        'firebase-admin/firestore': false,
        'firebase-admin/storage': false,
        'pg': false,
        'pg-pool': false,
        'drizzle-orm': false,
      };

      // Add fallbacks for node built-ins
      config.resolve.fallback = {
        ...config.resolve.fallback,
        'node:process': false,
        'process': false,
        'node:buffer': false,
        'buffer': false,
        'node:util': false,
        'util': false,
        'node:stream': false,
        'stream': false,
      };
    }
    return config;
  },

  // Server-only packages (Next.js 16+)
  serverExternalPackages: [
    'firebase-admin',
    'pg',
    'pg-pool',
    'drizzle-orm',
  ],

  // Turbopack config (Next.js 16+)
  turbopack: {
    // Turbopack handles server externals automatically
  },
};

export default nextConfig;
