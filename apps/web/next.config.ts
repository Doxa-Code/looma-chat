import type { NextConfig } from "next";
import withFlowbiteReact from "flowbite-react/plugin/nextjs";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@mastra/*"],
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push("bcrypt");
    }
    return config;
  },
};

export default withFlowbiteReact(nextConfig) as any;
