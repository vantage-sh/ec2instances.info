"use client";

import {
    MarketingSchema,
    InstanceGroupType,
    validateMarketing,
    PromotionIf,
} from "@/schemas/marketing";
import { useEffect, useState } from "react";
import { MARKETING_JSON_URL } from "./advertUrl";
import { abGroup, browserBlockingLocalStorage } from "@/utils/abGroup";

const style = {
    color: "white",
    backgroundImage:
        "url(https://assets.vantage.sh/www/instances-banner-blue.png)",
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
};

async function fetchOrGetCachedMarketingData(marketingData: MarketingSchema) {
    // Cache this for 30 minutes.
    if (!browserBlockingLocalStorage) {
        const cachedString = localStorage.getItem("vantage-marketing-data");
        if (cachedString) {
            let cachedData: {
                timestamp: number;
                data: MarketingSchema;
            } = JSON.parse(cachedString);
            const d = validateMarketing(cachedData.data);
            if (cachedData.timestamp >= Date.now() - 30 * 60 * 1000) {
                return d;
            }
        }
    }

    // Fetch the latest marketing data.
    try {
        const res = await fetch(MARKETING_JSON_URL);
        const newData = validateMarketing(await res.json());
        if (!browserBlockingLocalStorage) {
            localStorage.setItem(
                "vantage-marketing-data",
                JSON.stringify({
                    timestamp: Date.now(),
                    data: newData,
                }),
            );
        }
        return newData;
    } catch {}

    // Use the old marketing data if the fetch fails.
    return marketingData;
}

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

    // Get the cta.
    const [cta, setCta] = useState<{
        title: string;
        cta_text: string;
        cta_url: string;
    } | null>(null);

    const [loadedMarketingData, setLoadedMarketingData] =
        useState(marketingData);
    useEffect(() => {
        let active = true;
        fetchOrGetCachedMarketingData(marketingData)
            .then((data) => {
                if (active) setLoadedMarketingData(data);
            })
            .catch(() => {
                console.error("Failed to fetch marketing data");
            });
        return () => {
            active = false;
        };
    }, [marketingData]);

    // Handle the client-side logic.
    useEffect(() => {
        // Add 1 to the use counter.
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

        // Handle the selected promotion.
        const selectedPromotion = loadedMarketingData.promotions[instanceGroup];
        for (const promotion of selectedPromotion || []) {
            if (processIfBranches(promotion.if, gpu, useCounter)) {
                setCta(loadedMarketingData.ctas[promotion.cta]);
                return;
            }
        }

        // Try with the generic promotion.
        const genericPromotion = loadedMarketingData.promotions.generic;
        for (const promotion of genericPromotion || []) {
            if (processIfBranches(promotion.if, gpu, useCounter)) {
                setCta(loadedMarketingData.ctas[promotion.cta]);
                return;
            }
        }

        // Throw if no promotion was found.
        setTimeout(() => {
            throw new Error("No promotion found");
        }, 0);
    }, [gpu, loadedMarketingData]);

    // By default, show the banner with no context.
    if (!cta) {
        return (
            <div className="h-[2.5em]" style={style}>
                <div className="flex items-center justify-center h-full"></div>
            </div>
        );
    }

    // Return when the cta is found.
    return (
        <a href={cta.cta_url} target="_blank">
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
