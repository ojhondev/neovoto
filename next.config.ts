import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Server Actions são usadas para autenticação e mutações do painel.
  },
};

export default nextConfig;
