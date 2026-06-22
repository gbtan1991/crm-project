import type { NextConfig } from "next";

import "./env/server.mjs";

const nextConfig: NextConfig = {
  output: "standalone",
};

export default nextConfig;
