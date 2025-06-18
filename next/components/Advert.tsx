"use client";

import { usePathname } from "next/navigation";

const AzureAd = () => (
    <p>
        <span className="font-bold">Trying to save on Azure?</span> Get a demo
        of Vantage from a FinOps expert.
    </p>
);

const AWSAd = () => (
    <p>
        Vantage is the FinOps platform your engineering team will actually use.{" "}
        <span className="font-bold">Get a demo.</span>
    </p>
);

const style = {
    color: "white",
    backgroundImage: "url(https://assets.vantage.sh/www/instances-banner.png)",
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
};

export default function Advert() {
    if (process.env.NEXT_PUBLIC_REMOVE_ADVERTS === "1") return null;

    const pathname = usePathname();

    const href = pathname.startsWith("/azure")
        ? "https://vantage.sh/lp/azure-instances-demo?utm_campaign=Instances%20Blog%20Clicks&utm_source=azure-banner"
        : "https://vantage.sh/lp/aws-instances-demo?utm_campaign=Instances%20Blog%20Clicks&utm_source=aws-banner";

    return (
        <a href={href} target="_blank">
            <div className="h-[2.5em]" style={style}>
                <div className="flex items-center justify-center h-full">
                    <img
                        src="/vantage-logo-icon-banner.svg"
                        aria-hidden="true"
                        className="h-4 mr-1.5"
                    />
                    {pathname.startsWith("/azure") ? <AzureAd /> : <AWSAd />}
                </div>
            </div>
        </a>
    );
}
