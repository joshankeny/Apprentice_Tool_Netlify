import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: { remotePatterns: [{ protocol: "https", hostname: "**.supabase.co" }] },
  experimental: { serverActions: { bodySizeLimit: 4_400_000 } }
};

export default nextConfig;
