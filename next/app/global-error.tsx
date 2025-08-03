"use client";

import { Button } from "@/components/ui/button";
import { translationToolDetected } from "@/state";
import { useEffect } from "react";

export default function GlobalError({ error }: { error: Error }) {
    useEffect(() => {
        // If NEXT_PUBLIC_SENTRY_DSN is set, report the error to Sentry.
        let reportPromise: Promise<string | void> = Promise.resolve();
        if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
            reportPromise = import("@sentry/nextjs").then(
                ({ captureException }) =>
                    captureException(error, {
                        extra: {
                            translation_tool:
                                translationToolDetected.nonReactGet(),
                        },
                    }),
            );
        }

        reportPromise.finally(() => {
            // Always log the error to the console.
            console.error(error);

            // If this isn't development, try clearing query params and refreshing the page.
            if (process.env.NODE_ENV !== "development") {
                const url = new URL(window.location.href);
                if (url.searchParams.size > 0) {
                    url.search = "";
                    window.history.replaceState({}, "", url.toString());
                    window.location.reload();
                }
            }
        });
    }, [error]);

    const clearStorage = () => {
        try {
            localStorage.clear();
        } catch {}
        try {
            sessionStorage.clear();
        } catch {}
        window.location.reload();
    };

    return (
        <main className="h-[calc(100vh-6rem)] flex flex-col">
            <div className="flex-1 flex flex-col items-center justify-center mx-4">
                <h1 className="text-4xl font-bold">Well... this is awkward.</h1>
                <p className="text-lg mt-2">
                    An error occurred while loading the page. Clearing your
                    storage and refreshing the page may fix it.
                </p>
                <Button
                    onClick={clearStorage}
                    variant="outline"
                    size="lg"
                    className="mt-4"
                >
                    Clear Storage and Refresh
                </Button>
            </div>
        </main>
    );
}
