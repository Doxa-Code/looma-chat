import type { NextConfig } from "next";
import withFlowbiteReact from "flowbite-react/plugin/nextjs";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@mastra/*"],
};

export default withFlowbiteReact(nextConfig);
