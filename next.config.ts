import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // better-sqlite3는 네이티브 모듈이라 번들링 대상에서 제외한다.
  serverExternalPackages: ["better-sqlite3"],
  experimental: {
    // 리포트 PDF 업로드는 기본 1MB 제한을 넘긴다.
    serverActions: { bodySizeLimit: "40mb" },
  },
};

export default nextConfig;
