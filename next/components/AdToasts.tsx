"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { browserBlockingLocalStorage } from "@/utils/abGroup";
import { Button } from "./ui/button";
import cfTrace from "@/utils/cfTrace";
import {
    marketingData,
    resolveToast,
    utmContentFromPath,
} from "@/utils/marketing";

type ResolvedToast = ReturnType<typeof resolveToast>;

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

function processToasts(
    toasts: ResolvedToast[],
    trace: { [key: string]: string } | null,
) {
    for (const t of toasts.slice().reverse()) {
        if (
            browserBlockingLocalStorage ||
            localStorage.getItem(`toastDismissed-${t.campaign_id}`)
        ) {
            continue;
        }

        if (t.countries) {
            if (
                !trace ||
                !trace["loc"] ||
                !t.countries.includes(trace["loc"])
            ) {
                continue;
            }
        }

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

function runToasts() {
    const pageContent = utmContentFromPath(window.location.pathname);
    const toasts = marketingData.toasts
        .filter((t) => t.enabled)
        .map((t) => resolveToast(t, pageContent));

    cfTrace().then((trace) => {
        processToasts(toasts, trace);
    });
}

export default function AdToasts() {
    if (process.env.NEXT_PUBLIC_REMOVE_ADVERTS === "1") return null;

    const ranRef = useRef(false);
    useEffect(() => {
        if (ranRef.current) return;
        ranRef.current = true;
        runToasts();
    }, []);
    return null;
}
