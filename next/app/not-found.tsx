"use client";

import { getPlacement, utmContentFromPath } from "@/utils/marketing";
import { usePathname } from "next/navigation";

export default function Page404() {
    const full =
        process.env.NEXT_PUBLIC_REMOVE_ADVERTS === "1"
            ? "h-[calc(100vh-6em)]"
            : "h-[calc(100vh-8.5em)]";

    const pathname = usePathname();
    const slack = getPlacement(
        "inline.slack",
        utmContentFromPath(pathname || "/"),
    );

    return (
        <main
            className={`flex flex-col items-center justify-center ${full} mx-4`}
        >
            <h1 className="text-2xl font-bold mb-2">Page not found</h1>
            <p>
                The page you are looking for does not exist. Is this unexpected?
                If so,{" "}
                {slack ? (
                    <a
                        className="text-purple-1 hover:text-purple-0"
                        href={slack.href}
                        target="_blank"
                    >
                        {slack.label}
                    </a>
                ) : (
                    "please let us know."
                )}
            </p>
        </main>
    );
}
