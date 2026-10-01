import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@resvg/resvg-js", "satori", "harfbuzzjs", "pg"],
  images: { unoptimized: true },
  outputFileTracingIncludes: { "/api/**": ["./public/fonts/**"] },
};

export default nextConfig;
