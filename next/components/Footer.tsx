"use client";

import { Button } from "@/components/ui/button";
import { useTranslations } from "gt-next";

type FooterProps = {
    locale?: string;
};

export default function Footer({ locale = "en-GB" }: FooterProps) {
    const t = useTranslations();

    return (
        <div className="border-t border-gray-3 h-[3rem] sticky bottom-0 text-xs text-gray-2 bg-background">
            <div className="flex items-center justify-between h-full px-2">
                <div className="flex items-center gap-3">
                    <div className="hidden md:block">
                        {t("footer.updated", {
                            date: new Date().toLocaleString(locale),
                        })}
                    </div>
                </div>
                <div className="hidden md:block">{t("footer.tagline")}</div>
                <div className="flex items-center gap-3">
                    <a
                        href="https://handbook.vantage.sh/tools/instances/"
                        target="_blank"
                        className="text-purple-brand text-underline hover:text-purple-0"
                    >
                        {t("footer.docs")}
                    </a>
                    <span>
                        {t("footer.by")}{" "}
                        <a
                            target="_blank"
                            href="https://www.vantage.sh/lp/aws-instances-demo?utm_campaign=Instances%20Blog%20Clicks&utm_source=by-vantage"
                            className="text-purple-brand text-underline hover:text-purple-0"
                        >
                            {t("footer.vantage")}
                        </a>
                    </span>
                    <form
                        action="https://console.vantage.sh/signup"
                        method="GET"
                        className="hidden md:flex gap-2"
                    >
                        <div className="hidden md:block">
                            <input
                                className="px-3 py-2 border border-gray-3 rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-purple-1 focus:border-transparent"
                                name="authentication_email"
                                placeholder={t("footer.emailPlaceholder")}
                                type="email"
                                required
                            />
                        </div>
                        <div className="hidden md:block">
                            <Button variant="outline" size="sm">
                                {t("footer.getApiKey")}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
