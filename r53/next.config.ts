import type { NextConfig } from "next";
import { securityHeadersForNextConfig } from "./src/lib/security/headers";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,

  // ★ v3.0.0: Security headers ระดับ platform ใหญ่
  // (CSP, HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy, etc.)
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeadersForNextConfig,
      },
    ];
  },

  // ★ v3.0.0: ปิด X-Powered-By header (ป้องกัน fingerprinting)
  poweredByHeader: false,

  // ★ v3.0.0: จำกัด image optimization domains (ป้องกัน SSRF)
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
    ],
    // ป้องกันรูปขนาดใหญ่ที่ใช้ประมวลผลหนัก
    minimumCacheTTL: 60,
    formats: ["image/avif", "image/webp"],
  },

  // ★ v3.0.0: จำกัด experimental features ที่อาจเปิด attack surface
  experimental: {
    // ปิด CSR ที่ไม่จำเป็น เพื่อลด client bundle
    optimizePackageImports: ["lucide-react", "date-fns"],
  },
};

export default nextConfig;
