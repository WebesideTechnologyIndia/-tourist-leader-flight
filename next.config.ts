import type { NextConfig } from "next";

// Set when building on the shared host, where the build runs under a per-account
// resource cap rather than on a dedicated builder.
const isSharedHostBuild = process.env.BUILD_STANDALONE === "1";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  // Self-contained server bundle for the Hostinger (Passenger) deploy.
  // Left off elsewhere so managed-platform builds keep their own output handling.
  output: isSharedHostBuild ? "standalone" : undefined,
  ...(isSharedHostBuild
    ? {
        experimental: { cpus: Number(process.env.BUILD_CPUS) || 1 },
      }
    : {}),
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      // Vercel Blob public storage (uploaded package/hotel images)
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
    ],
  },
};

export default nextConfig;
