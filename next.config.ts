import type { NextConfig } from "next";

import "./env/server.mjs";

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: ['deservedly-underaccommodated-maryrose.ngrok-free.dev'],
};

export default nextConfig;
