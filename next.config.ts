import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@resvg/resvg-js", "satori", "harfbuzzjs", "@libsql/client"],
  images: { unoptimized: true },
  outputFileTracingIncludes: { "/api/**": ["./public/fonts/**"] },
};

export default nextConfig;
