import type { NextConfig } from "next";

const staticExport = !!process.env.STATIC_EXPORT;

const nextConfig: NextConfig = staticExport
  ? // `STATIC_EXPORT=1 npm run build` writes a plain static site to ./out
    // (static export can't use cacheComponents/PPR).
    { output: "export" }
  : { cacheComponents: true, partialPrefetching: true };

export default nextConfig;
