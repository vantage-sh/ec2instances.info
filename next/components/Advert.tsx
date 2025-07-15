"use client";

import {
    MarketingSchema,
    InstanceGroupType,
    validateMarketing,
} from "@/schemas/marketing";
import { useEffect, useState } from "react";
import { MARKETING_JSON_URL } from "./advertUrl";

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

    // Fetch the latest marketing data.
    try {
        const res = await fetch(MARKETING_JSON_URL);
        const newData = validateMarketing(await res.json());
        localStorage.setItem(
            "vantage-marketing-data",
            JSON.stringify({
                timestamp: Date.now(),
                data: newData,
            }),
        );
        return newData;
    } catch {}

    // Use the old marketing data if the fetch fails.
    return marketingData;
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

    // Handle a server-friendly execution path. We will handle the client-side
    // logic in effects.
    const [cta, setCta] = useState(() => {
        // Handle the selected promotion.
        const selectedPromotion = marketingData.promotions[instanceGroup];
        for (const promotion of selectedPromotion || []) {
            if (promotion.if) {
                if (promotion.if.gpu && gpu) {
                    return marketingData.ctas[promotion.cta];
                }
            } else {
                return marketingData.ctas[promotion.cta];
            }
        }

        // Try with the generic promotion.
        const genericPromotion = marketingData.promotions.generic;
        for (const promotion of genericPromotion || []) {
            if (promotion.if) {
                if (promotion.if.ab) continue;
                if (promotion.if.gpu && gpu) {
                    return marketingData.ctas[promotion.cta];
                }
            } else {
                return marketingData.ctas[promotion.cta];
            }
        }

        // If no promotion was found, handle it differently depending on if this
        // is the server (if this is the server, scream!).
        if (typeof window === "undefined") {
            throw new Error("No promotion found");
        } else {
            setTimeout(() => {
                throw new Error("No promotion found");
            }, 0);
        }

        // Return a generic promotion.
        const cta = Object.keys(marketingData.ctas)[0];
        if (cta) {
            return marketingData.ctas[cta];
        }
        return null;
    });

    // Make an ab group.
    const [abGroup, setAbGroup] = useState(false);
    useEffect(() => {
        const localStorageValue = localStorage.getItem("vantage-ab-group");
        if (localStorageValue) {
            setAbGroup(Boolean(localStorageValue));
        } else {
            const random = Math.random();
            const ab = random < 0.5;
            localStorage.setItem("vantage-ab-group", ab.toString());
            setAbGroup(ab);
        }
    }, []);

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
        let useCounter = Number(
            localStorage.getItem("vantage-use-counter") || "0",
        );
        localStorage.setItem(
            "vantage-use-counter",
            (useCounter + 1).toString(),
        );

        // Handle the selected promotion.
        const selectedPromotion = loadedMarketingData.promotions[instanceGroup];
        for (const promotion of selectedPromotion || []) {
            if (promotion.if) {
                if (promotion.if.ab && abGroup) {
                    setCta(loadedMarketingData.ctas[promotion.cta]);
                    return;
                }
                if (promotion.if.gpu && gpu) {
                    setCta(loadedMarketingData.ctas[promotion.cta]);
                    return;
                }
                if (
                    promotion.if.uses_gt &&
                    useCounter >= promotion.if.uses_gt
                ) {
                    setCta(loadedMarketingData.ctas[promotion.cta]);
                    return;
                }
            } else {
                setCta(loadedMarketingData.ctas[promotion.cta]);
                return;
            }
        }

        // Try with the generic promotion.
        const genericPromotion = loadedMarketingData.promotions.generic;
        for (const promotion of genericPromotion || []) {
            if (promotion.if) {
                if (promotion.if.ab && abGroup) {
                    setCta(loadedMarketingData.ctas[promotion.cta]);
                    return;
                }
                if (promotion.if.gpu && gpu) {
                    setCta(loadedMarketingData.ctas[promotion.cta]);
                    return;
                }
            } else {
                setCta(loadedMarketingData.ctas[promotion.cta]);
                return;
            }
        }

        // Throw if no promotion was found.
        throw new Error("No promotion found");
    }, [gpu, abGroup, loadedMarketingData]);

    const handledCta =
        cta ||
        (() => {
            if (typeof window === "undefined") {
                throw new Error("No CTA found");
            } else {
                setTimeout(() => {
                    throw new Error("No CTA found");
                }, 0);
            }
            return {
                title: "Get a demo",
                cta_text: "Get a demo of Vantage from a FinOps expert.",
                cta_url:
                    "https://vantage.sh/lp/aws-instances-demo?utm_campaign=Instances%20Blog%20Clicks&utm_source=aws-banner",
            };
        })();

    return (
        <a href={handledCta.cta_url} target="_blank">
            <div className="h-[2.5em]" style={style}>
                <div className="flex items-center justify-center h-full">
                    <img
                        src="/vantage-logo-icon-banner.svg"
                        aria-hidden="true"
                        className="h-4 mr-1.5"
                    />
                    <p>
                        {handledCta.title}{" "}
                        <span className="font-bold">{handledCta.cta_text}</span>
                    </p>
                </div>
            </div>
        </a>
    );
}
