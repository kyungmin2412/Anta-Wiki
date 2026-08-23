import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // 리포트 PDF 업로드는 기본 1MB 제한을 넘긴다.
    serverActions: { bodySizeLimit: "40mb" },
  },
};

export default nextConfig;
