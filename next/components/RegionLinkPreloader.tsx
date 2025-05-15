import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

const linksMapping: Set<{
    readonly y: number;
    update: () => void;
    preload: () => void;
}> =
    typeof window !== "undefined"
        ? // @ts-expect-error: This is not typed to get on the window.
          window.__LINKS_MAPPING__ || new Set()
        : new Set();

const OFFSET = 300;

let lastY = -1;

function handleMouseMove(event: MouseEvent) {
    lastY = event.clientY;
    for (const link of linksMapping) {
        if (
            event.clientY < link.y + OFFSET &&
            event.clientY > link.y - OFFSET
        ) {
            link.preload();
        }
    }
}

function handleWindowMovement() {
    for (const link of linksMapping) {
        link.update();
    }
}

if (typeof window !== "undefined") {
    if (!("__LINKS_MAPPING__" in window)) {
        // @ts-expect-error: This is not typed to get on the window.
        window.__LINKS_MAPPING__ = linksMapping;
        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("scroll", handleWindowMovement);
        window.addEventListener("resize", handleWindowMovement);
    }
}

export default ({
    prefetch = true,
    ...props
}: Omit<React.ComponentProps<typeof Link>, "ref">) => {
    const router = useRouter();
    const internalRef = useRef<HTMLAnchorElement>(null);

    useEffect(() => {
        // If the link is not prefetched, we don't need to do anything.
        if (!prefetch || !internalRef.current) return;

        // Get the element and then find its position in the DOM.
        const element = internalRef.current;
        const rect = element.getBoundingClientRect();
        let y = rect.top + window.scrollY;

        // Defines the timeout for the preload.
        let preloadTimeout: any;

        // Defines the object used for maths.
        let once = true;
        const linkObj = {
            get y() {
                return y;
            },
            update: () => {
                const rect = element.getBoundingClientRect();
                y = rect.top + window.scrollY;
            },
            preload: () => {
                if (preloadTimeout) clearTimeout(preloadTimeout);
                preloadTimeout = setTimeout(() => {
                    if (
                        lastY < linkObj.y + OFFSET &&
                        lastY > linkObj.y - OFFSET
                    ) {
                        // If the cursor is still in range, we should preload the link.
                        if (once) {
                            once = false;
                            router.prefetch(element.href);
                        }
                    }
                }, 20);
            },
        };

        // Add the link to the mapping.
        linksMapping.add(linkObj);
        return () => {
            linksMapping.delete(linkObj);
            if (preloadTimeout) {
                clearTimeout(preloadTimeout);
            }
        };
    }, [internalRef.current, prefetch, router, linksMapping]);

    if (!prefetch) {
        return <Link prefetch={false} {...props} />;
    }

    return <Link ref={internalRef} prefetch={false} {...props} />;
};
