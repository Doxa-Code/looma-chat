import withFlowbiteReact from "flowbite-react/plugin/nextjs";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push("bcrypt");
    }
    return config;
  },
};

export default withFlowbiteReact(nextConfig) as any;
