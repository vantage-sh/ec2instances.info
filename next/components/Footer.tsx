"use client";

import TranslationFriendlyLink from "@/components/TranslationFriendlyLink";
import { buttonVariants } from "@/components/ui/button";
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
                    <div className="hidden md:block">
                        <TranslationFriendlyLink
                            href="https://instances-api.vantage.sh/?utm_campaign=Instances%20Blog%20Clicks&utm_source=footer"
                            target="_blank"
                            className={buttonVariants({
                                variant: "outline",
                                size: "sm",
                            })}
                        >
                            {t("footer.getApiKey")}
                        </TranslationFriendlyLink>
                    </div>
                </div>
            </div>
        </div>
    );
}
