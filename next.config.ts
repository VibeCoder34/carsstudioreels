import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: [
    "@remotion/bundler",
    "@remotion/renderer",
    "@remotion/cloudrun",
    "esbuild",
    "@esbuild/win32-x64",
  ],
  // Dinamik import ile yüklenen Remotion paketlerini standalone çıktıya dahil et
  outputFileTracingIncludes: {
    "/api/render": [
      "./node_modules/@remotion/**/*",
      "./node_modules/remotion/**/*",
      "./node_modules/esbuild/**/*",
      "./node_modules/@esbuild/**/*",
    ],
  },
  turbopack: {
    rules: {
      "*.md": {
        loaders: ["raw-loader"],
        as: "*.js",
      },
    },
  },
};

export default nextConfig;
