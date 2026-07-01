import type { NextConfig } from "next";

import "./env/server.mjs";

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: ['bring-envious-trivial.ngrok-free.dev'],
};

export default nextConfig;
