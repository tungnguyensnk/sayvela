import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, {dev}) => {
    config.resolve.alias.canvas = false;
    config.resolve.alias.encoding = false;

    // Enable file watching with polling for Docker
    if (dev) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      };
    }

    return config;
  },
};

export default nextConfig;
