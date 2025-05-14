import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    /* config options here */
    output: "export",
    typescript: {
        ignoreBuildErrors: true,
    },
};

export default nextConfig;
