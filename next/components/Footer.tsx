"use client";

import TranslationFriendlyLink from "@/components/TranslationFriendlyLink";
import { buttonVariants } from "@/components/ui/button";
import { usePathname } from "next/navigation";
import { getPlacement, utmContentFromPath } from "@/utils/marketing";

export default function Footer() {
    const pathname = usePathname();
    const pageContent = utmContentFromPath(pathname);
    const docs = getPlacement("footer.docs", pageContent);
    const byVantage = getPlacement("footer.by_vantage", pageContent);
    const api = getPlacement("footer.api", pageContent);

    return (
        <div className="border-t border-gray-3 h-[3rem] sticky bottom-0 text-xs text-gray-2 bg-background">
            <div className="flex items-center justify-between h-full px-2">
                <div className="flex items-center gap-3">
                    <div className="hidden md:block">
                        Updated {new Date().toLocaleString()}
                    </div>
                </div>
                <div className="hidden md:block">
                    EC2Instances.info - Easy Amazon <b>EC2</b> Instance
                    Comparison
                </div>
                <div className="flex items-center gap-3">
                    {docs && (
                        <a
                            href={docs.href}
                            target="_blank"
                            className="text-purple-brand text-underline hover:text-purple-0"
                        >
                            {docs.label}
                        </a>
                    )}
                    {byVantage && (
                        <span>
                            By{" "}
                            <a
                                target="_blank"
                                href={byVantage.href}
                                className="text-purple-brand text-underline hover:text-purple-0"
                            >
                                {byVantage.label}
                            </a>
                        </span>
                    )}
                    {api && (
                        <div className="hidden md:block">
                            <TranslationFriendlyLink
                                href={api.href}
                                target="_blank"
                                className={buttonVariants({
                                    variant: "outline",
                                    size: "sm",
                                })}
                            >
                                {api.label}
                            </TranslationFriendlyLink>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
