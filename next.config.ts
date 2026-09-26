import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The dev server binds 0.0.0.0, so a browser on 127.0.0.1 is a different host.
  // Without this, Next blocks /_next client scripts and the page never hydrates.
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  async redirects() {
    return [
      { source: "/names", destination: "/", permanent: false },
      { source: "/floor", destination: "/", permanent: false },
    ];
  },
};

export default nextConfig;
