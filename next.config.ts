import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@wterm/dom", "@wterm/react", "@wterm/core"],
  // Block streaming metadata so descriptions stay in <head> (Lighthouse SEO).
  htmlLimitedBots: /.*/,
};

export default nextConfig;
