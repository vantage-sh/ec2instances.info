"use client";

import { useEffect, useRef } from "react";
import { array, InferOutput, object, string, parse } from "valibot";
import { toast } from "sonner";
import { browserBlockingLocalStorage } from "@/utils/abGroup";

const toastsSchema = array(
    object({
        campaign_id: string(),
        message: string(),
        url: string(),
    }),
);

type Toasts = InferOutput<typeof toastsSchema>;

function setUnlessBlockingLocalStorage(key: string, value: string) {
    if (!browserBlockingLocalStorage) {
        localStorage.setItem(key, value);
    }
}

function processToasts(toasts: Toasts) {
    for (const t of toasts.slice().reverse()) {
        // Check if the user dismissed this
        if (
            browserBlockingLocalStorage ||
            localStorage.getItem(`toastDismissed-${t.campaign_id}`)
        ) {
            continue;
        }

        // Show the toast
        toast(t.message, {
            onDismiss: () => {
                setUnlessBlockingLocalStorage(
                    `toastDismissed-${t.campaign_id}`,
                    "true",
                );
            },
            action: {
                onClick: () => {
                    window.open(t.url, "_blank");
                    setUnlessBlockingLocalStorage(
                        `toastDismissed-${t.campaign_id}`,
                        "true",
                    );
                },
                label: "Visit",
            },
            closeButton: true,
            duration: Infinity,
        });
    }
}

function getUnlessUserDoesntHaveLocalStorage(key: string) {
    if (!browserBlockingLocalStorage) return localStorage.getItem(key);
    return null;
}

function runToasts(initialToasts: Toasts) {
    // Check if we have it in our cache
    const toastsCache = getUnlessUserDoesntHaveLocalStorage("toastsShown");
    if (toastsCache) {
        try {
            const [endTime, toasts]: [number, Toasts] = JSON.parse(toastsCache);
            if (Date.now() < endTime) {
                processToasts(toasts);
                return;
            }
        } catch {
            // Bad JSON for some reason :(
        }
    }

    // Try to fetch the toasts
    fetch("https://instances.vantage.sh/toasts.json")
        .then((res) => res.json())
        .then((data) => {
            const toasts = parse(toastsSchema, data);
            processToasts(toasts);

            // Cache for 2 hours
            const endTime = Date.now() + 2 * 60 * 60 * 1000;
            setUnlessBlockingLocalStorage(
                "toastsShown",
                JSON.stringify([endTime, toasts]),
            );
        })
        .catch(() => {
            // If we're unable to fetch, just use the initial toasts
            processToasts(initialToasts);
        });
}

export default function AdToasts({ initialToasts }: { initialToasts: Toasts }) {
    if (process.env.NEXT_PUBLIC_REMOVE_ADVERTS === "1") return null;

    const ranRef = useRef(false);
    useEffect(() => {
        if (ranRef.current) return;
        ranRef.current = true;
        runToasts(initialToasts);
    }, []);
    return null;
}
