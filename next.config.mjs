/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Keep native/binary-heavy packages out of the server bundle so they load
  // from node_modules at runtime (sharp, ffmpeg, prisma).
  experimental: {
    serverComponentsExternalPackages: ['sharp', 'ffmpeg-static', '@prisma/client', 'prisma'],
  },
  eslint: {
    // Lint is run explicitly via `npm run lint`; do not fail production builds on it.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
