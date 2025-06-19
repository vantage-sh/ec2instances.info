let importedCaptureRouterTransitionStart: (
    href: string,
    navigationType: string,
) => void | undefined;

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    import("@sentry/nextjs").then(
        ({ init, captureRouterTransitionStart, replayIntegration }) => {
            init({
                dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

                // Set the sample rate to 10%. With our user rate, this is still a
                // lot of useful information.
                tracesSampleRate: 0.1,

                // Turn on replays.
                integrations: [replayIntegration()],
                replaysSessionSampleRate: 0.1,
                replaysOnErrorSampleRate: 1.0,
            });
            importedCaptureRouterTransitionStart = captureRouterTransitionStart;
        },
    );
}

export const onRouterTransitionStart = (
    href: string,
    navigationType: string,
) => {
    if (importedCaptureRouterTransitionStart) {
        importedCaptureRouterTransitionStart(href, navigationType);
    }
};
