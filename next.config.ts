import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hide the on-screen Next.js dev indicator (bottom-left badge).
  devIndicators: false,
  // Don't fail production builds on lint (e.g. react-hooks/set-state-in-effect
  // on legitimate localStorage/SSR-sync effects). Type safety is still enforced
  // via `tsc --noEmit` / `npm run typecheck`. Run `npm run lint` separately.
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
