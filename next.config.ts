import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "example.com",
      },
      {
        protocol: "https",
        hostname: "**.example.com",
      },
      {
        protocol: "https",
        hostname: "i.postimg.cc",
      },
    ],
  },
};

export default nextConfig;
