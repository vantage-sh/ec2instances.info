import { withSentryConfig } from "@sentry/nextjs";
import { withGTConfig } from "gt-next/config";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import type { NextConfig } from "next";

let nextConfig: NextConfig = {
    typescript: {
        ignoreBuildErrors: true,
    },
    turbopack: {
        root: __dirname,
    },
    productionBrowserSourceMaps: true,
    async redirects() {
        // Re-homed from the retired worker.js: send the legacy apex/www
        // hostnames to the canonical domain with a permanent redirect.
        // http -> https is handled by the Cloudflare zone ("Always Use HTTPS").
        return [
            {
                source: "/:path*",
                has: [{ type: "host", value: "ec2instances.info" }],
                destination: "https://instances.vantage.sh/:path*",
                permanent: true,
            },
            {
                source: "/:path*",
                has: [{ type: "host", value: "www.ec2instances.info" }],
                destination: "https://instances.vantage.sh/:path*",
                permanent: true,
            },
        ];
    },
};

nextConfig = withGTConfig(nextConfig, {
    dictionary: "./dictionary.ts",
    loadDictionaryPath: "./loadDictionary.ts",
    loadTranslationsPath: "./loadTranslations.ts",
    experimentalLocaleResolution: true,
    experimentalLocaleResolutionParam: "locale",
});

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

initOpenNextCloudflareForDev();

export default nextConfig;
