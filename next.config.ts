import type { NextConfig } from "next";

const extraAllowedOrigins = (process.env.ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Allow the dev server to be reached through the proxied preview host as well as localhost.
  allowedDevOrigins: ["*.e2b.app", "localhost", "127.0.0.1", ...extraAllowedOrigins],
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
      allowedOrigins: ["*.e2b.app", ...extraAllowedOrigins],
    },
  },
  images: {
    // Portfolio covers are user-supplied URLs from arbitrary hosts; they are rendered
    // unoptimised through a plain <img> so no remote-pattern allow-list is required.
    unoptimized: true,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
