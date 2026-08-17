import type { NextConfig } from "next";

// Set when building on the shared host, where the build runs under a per-account
// resource cap rather than on a dedicated builder.
const isSharedHostBuild = process.env.BUILD_STANDALONE === "1";

const nextConfig: NextConfig = {
  // Self-contained server bundle for the Hostinger (Passenger) deploy.
  // Left off elsewhere so managed-platform builds keep their own output handling.
  output: isSharedHostBuild ? "standalone" : undefined,
  // Pin the module-resolution root to this project. Without it Turbopack walks
  // up and can latch onto an unrelated lockfile higher in the filesystem.
  turbopack: { root: process.cwd() },
  // That box reports 64 CPUs but caps how many threads the account may hold open.
  // Each build worker brings its own native thread pools sized to the CPU count,
  // so the default pool blows the limit and workers abort mid-build.
  ...(isSharedHostBuild
    ? { experimental: { cpus: Number(process.env.BUILD_CPUS) || 1 } }
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
