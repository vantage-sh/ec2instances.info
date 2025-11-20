"use client";

import { useEffect, useRef } from "react";
import { array, InferOutput, object, string, parse, optional } from "valibot";
import { toast } from "sonner";
import { browserBlockingLocalStorage } from "@/utils/abGroup";
import { Button } from "./ui/button";

const toastsSchema = array(
    object({
        campaign_id: string(),
        message: string(),
        image_alt_text: optional(string()),
        image_url: optional(string()),
        url: string(),
    }),
);

type Toasts = InferOutput<typeof toastsSchema>;

function setUnlessBlockingLocalStorage(key: string, value: string) {
    if (!browserBlockingLocalStorage) {
        localStorage.setItem(key, value);
    }
}

function ToastInner({
    idContainer,
    message,
    imageUrl,
    imageAltText,
    visit,
}: {
    idContainer: [number | string | null];
    message: string;
    imageUrl?: string;
    imageAltText?: string;
    visit?: () => void;
}) {
    let title: string | undefined = undefined;
    let description = message;
    const idx = message.indexOf("\n");
    if (idx !== -1) {
        title = message.slice(0, idx);
        description = message.slice(idx + 1);
    }

    let element = (
        <p className="select-none">
            {description.split("\n").map((line, i) => (
                <span key={i}>
                    {line}
                    <br />
                </span>
            ))}
        </p>
    );
    if (title) {
        element = (
            <>
                <p className="select-none font-bold mb-1">{title}</p>
                {element}
            </>
        );
    }

    if (imageUrl) {
        element = (
            <>
                <img
                    src={imageUrl}
                    alt={imageAltText || ""}
                    draggable={false}
                    className="select-none non-draggable mb-2 max-h-32 w-auto mx-auto block"
                />
                {element}
            </>
        );
    }

    if (visit) {
        element = (
            <div className="block">
                <div className="mb-4">{element}</div>
                <div className="flex justify-end">
                    <Button
                        size="sm"
                        onClick={() => {
                            visit();
                            if (idContainer[0] !== null) {
                                toast.dismiss(idContainer[0]);
                            }
                        }}
                    >
                        Learn More
                    </Button>
                </div>
            </div>
        );
    }

    return element;
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

        // Show the toast. We have to do some janky circular stuff here to get the ID to the toast
        const idContainer: [number | string | null] = [null];
        const id = toast.message(
            () => (
                <ToastInner
                    idContainer={idContainer}
                    message={t.message}
                    imageUrl={t.image_url}
                    imageAltText={t.image_alt_text}
                    visit={() => {
                        window.open(t.url, "_blank");
                        setUnlessBlockingLocalStorage(
                            `toastDismissed-${t.campaign_id}`,
                            "true",
                        );
                    }}
                />
            ),
            {
                onDismiss: () => {
                    setUnlessBlockingLocalStorage(
                        `toastDismissed-${t.campaign_id}`,
                        "true",
                    );
                },
                closeButton: true,
                duration: Infinity,
            },
        );
        idContainer[0] = id;
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
