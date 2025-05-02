import type { Instance, Pricing } from "@/types";

// This function was copied from the compression worker. This is so that the function gets inlined in the worker.
// If you edit this, edit compression.worker.ts as well. I know this is ugly, but it needs to be there for the inlining to work.
export default function processRainbowTable(
    pricingRainbowTable: Map<number, string>,
    instance: Instance,
) {
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
            ][],
        ][],
    ][] = instance.pricing;
    const newPricing: Pricing = {};
    for (const region of pricing) {
        const regionKey = pricingRainbowTable.get(region[0]);
        const platforms: Pricing[string] = {};
        for (const platform of region[1]) {
            const platformKey = pricingRainbowTable.get(platform[0]);
            const kv: { [key: string]: any } = {};
            for (const v of platform[1]) {
                const key = pricingRainbowTable.get(v[0])!;
                if (key === "reserved") {
                    const reserved: any = {};
                    for (const reservedKv of v[1]) {
                        reserved[pricingRainbowTable.get(reservedKv[0])!] =
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
