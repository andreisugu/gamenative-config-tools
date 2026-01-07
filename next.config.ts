import type { NextConfig } from "next";

// Use environment variable for basePath, defaulting to GitHub Pages path
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '/gamenative-config-tools';

const nextConfig: NextConfig = {
  output: 'export',
  basePath: basePath,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
