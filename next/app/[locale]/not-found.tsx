"use client";

import { useTranslations } from "gt-next";

export default function Page404() {
    const t = useTranslations();
    const full =
        process.env.NEXT_PUBLIC_REMOVE_ADVERTS === "1"
            ? "h-[calc(100vh-6em)]"
            : "h-[calc(100vh-8.5em)]";

    return (
        <main
            className={`flex flex-col items-center justify-center ${full} mx-4`}
        >
            <h1 className="text-2xl font-bold mb-2">{t("notFound.title")}</h1>
            <p>
                {t("notFound.description")} {" "}
                <a
                    className="text-purple-1 hover:text-purple-0"
                    href="https://vantage.sh/slack"
                    target="_blank"
                >
                    {t("notFound.contactLink")}
                </a>
            </p>
        </main>
    );
}
