import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@resvg/resvg-js", "satori", "harfbuzzjs", "@libsql/client"],
  images: { unoptimized: true },
  // The floating dev badge sits on top of the assets panel.
  devIndicators: false,
  outputFileTracingIncludes: { "/api/**": ["./public/fonts/**"] },
};

export default nextConfig;
