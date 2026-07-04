import type { NextConfig } from "next";

import "./env/server.mjs";

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: ['bring-envious-trivial.ngrok-free.dev'],
  // VPS Docker builds often OOM during `next build` typechecking — validated locally/CI instead.
  typescript: {
    ignoreBuildErrors: process.env.DOCKER_BUILD === "1",
  },
};

export default nextConfig;
