import type { Pricing } from "@/types";

export default function processRainbowTable<
    Instance extends { pricing: Record<string, Record<string, any>> },
>(pricingRainbowTable: string[], instance: Instance) {
    // @ts-expect-error: This is intentionally the wrong type.
    const pricing: [
        // Region
        number,
        [
            // Platform
            number,
            [
                // Key inside platform
                number,
                any,
            ][] | [number, number],
        ][],
    ][] = instance.pricing;
    const newPricing: Pricing = {};
    for (const region of pricing) {
        const regionKey = pricingRainbowTable[region[0]];
        const platforms: Pricing[string] = {};
        for (const platform of region[1]) {
            const platformKey = pricingRainbowTable[platform[0]];
            if (typeof platform[1][0] === "number") {
                // This is a reference to another platform.
                const referencedRegion = pricingRainbowTable[platform[1][0]];
                const referencedPlatform = pricingRainbowTable[(platform as [number, [number, number]])[1][1]];
                platforms[platformKey] = referencedRegion === regionKey ?
                    platforms[referencedPlatform] :
                    newPricing[referencedRegion][referencedPlatform];
                continue;
            }

            const kv: { [key: string]: any } = {};
            for (const v of platform[1] as [number, any][]) {
                const key = pricingRainbowTable[v[0]]!;
                if (key === "reserved") {
                    const reserved: any = {};
                    for (const reservedKv of v[1]) {
                        reserved[pricingRainbowTable[reservedKv[0]]!] =
                            reservedKv[1];
                    }
                    kv[key] = reserved;
                } else {
                    kv[key] = v[1];
                }
            }
            // @ts-expect-error: This is intentionally the wrong type.
            platforms[platformKey] = kv;
        }
        newPricing[regionKey!] = platforms;
    }
    instance.pricing = newPricing;
    return instance;
}
