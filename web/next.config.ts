import type { NextConfig } from "next";

// The planner and the Strands agent live in the Python API (../api). In dev and in
// production the browser only ever talks to Next.js, which forwards /api/* there.
const API_URL = process.env.API_URL ?? "http://127.0.0.1:8000";

const nextConfig: NextConfig = {
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${API_URL}/api/:path*` }];
  },
};

export default nextConfig;
