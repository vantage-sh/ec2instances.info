import TranslationFriendlyLink from "@/components/TranslationFriendlyLink";
import { buttonVariants } from "@/components/ui/button";

export default function Footer() {
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
                    <a
                        href="https://handbook.vantage.sh/tools/instances/"
                        target="_blank"
                        className="text-purple-brand text-underline hover:text-purple-0"
                    >
                        Docs
                    </a>
                    <span>
                        By{" "}
                        <a
                            target="_blank"
                            href="https://www.vantage.sh/lp/aws-instances-demo?utm_campaign=Instances%20Blog%20Clicks&utm_source=by-vantage"
                            className="text-purple-brand text-underline hover:text-purple-0"
                        >
                            Vantage
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
                            Get API Key
                        </TranslationFriendlyLink>
                    </div>
                </div>
            </div>
        </div>
    );
}
