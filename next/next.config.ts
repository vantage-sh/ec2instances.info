import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

let nextConfig: NextConfig = {
    output: "export",
    typescript: {
        ignoreBuildErrors: true,
    },
    turbopack: {
        root: __dirname,
    },
};

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    nextConfig = withSentryConfig(nextConfig, {
        org: process.env.SENTRY_ORG,
        project: process.env.SENTRY_PROJECT,
        disableLogger: true,
        authToken: process.env.SENTRY_AUTH_TOKEN,
        widenClientFileUpload: true,
        reactComponentAnnotation: {
            enabled: true,
        },
    });
}

export default nextConfig;
