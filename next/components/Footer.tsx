import { Button } from "@/components/ui/button";

export default function Footer() {
    return (
        <div className="border-t border-gray-200 h-[3rem] sticky bottom-0 text-xs text-gray-2 bg-white">
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
                    <form
                        action="https://console.vantage.sh/signup"
                        method="GET"
                        className="hidden md:flex gap-2"
                    >
                        <div className="hidden md:block">
                            <input
                                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                name="authentication_email"
                                placeholder="Email"
                                type="email"
                                required
                            />
                        </div>
                        <div className="hidden md:block">
                            <Button variant="outline" size="sm">
                                Get API Key
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
