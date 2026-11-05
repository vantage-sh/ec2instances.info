"use client";

import {
    MarketingSchema,
    InstanceGroupType,
    BannerCta,
    PromotionIf,
} from "@/schemas/marketing";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { abGroup, browserBlockingLocalStorage } from "@/utils/abGroup";
import { resolveBannerCta, utmContentFromPath } from "@/utils/marketing";

function processIfBranches(
    ifs: PromotionIf | undefined,
    gpu: boolean,
    useCounter: number,
) {
    if (!ifs) return true;

    if (ifs.ab && !abGroup) return false;
    if (ifs.gpu && !gpu) return false;
    if (ifs.uses_gt && useCounter < ifs.uses_gt) return false;

    return true;
}

export default function Advert({
    gpu,
    instanceGroup,
    marketingData,
}: {
    gpu: boolean;
    instanceGroup: InstanceGroupType;
    marketingData: MarketingSchema;
}) {
    if (process.env.NEXT_PUBLIC_REMOVE_ADVERTS === "1") return null;

    const pathname = usePathname();
    const pageContent = utmContentFromPath(pathname);

    const [cta, setCta] = useState<BannerCta | null>(null);

    useEffect(() => {
        let useCounter = 0;
        if (!browserBlockingLocalStorage) {
            useCounter = Number(
                localStorage.getItem("vantage-use-counter") || "0",
            );
            localStorage.setItem(
                "vantage-use-counter",
                (useCounter + 1).toString(),
            );
        }

        const selectedPromotion =
            marketingData.banners.promotions[instanceGroup];
        for (const promotion of selectedPromotion || []) {
            if (processIfBranches(promotion.if, gpu, useCounter)) {
                const selected = marketingData.banners.ctas[promotion.cta];
                if (selected?.enabled) {
                    setCta(selected);
                    return;
                }
            }
        }

        const genericPromotion = marketingData.banners.promotions.generic;
        for (const promotion of genericPromotion || []) {
            if (processIfBranches(promotion.if, gpu, useCounter)) {
                const selected = marketingData.banners.ctas[promotion.cta];
                if (selected?.enabled) {
                    setCta(selected);
                    return;
                }
            }
        }

        setTimeout(() => {
            throw new Error("No promotion found");
        }, 0);
    }, [gpu, instanceGroup, marketingData]);

    const style = {
        color: "white",
        backgroundImage: `url(${marketingData.banners.backgroundImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
    };

    if (!cta) {
        return (
            <div className="h-[2.5em]" style={style}>
                <div className="flex items-center justify-center h-full"></div>
            </div>
        );
    }

    const href = resolveBannerCta(cta, pageContent);

    return (
        <a href={href} target="_blank">
            <div className="h-[2.5em]" style={style}>
                <div className="flex items-center justify-center h-full">
                    <img
                        src="/vantage-logo-icon-banner.svg"
                        aria-hidden="true"
                        className="h-4 mr-1.5"
                    />
                    <p>
                        {cta.title}{" "}
                        <span className="font-bold">{cta.cta_text}</span>
                    </p>
                </div>
            </div>
        </a>
    );
}
