import { Instance } from "@/types";

export default function makeRainbowTable(instances: Instance[]) {
    // Pass 1: Get all the keys.
    const pricingSet = new Set<string>();
    for (const instance of instances) {
        const pricing = instance.pricing;
        for (const region in pricing) {
            pricingSet.add(region);
            for (const platform in pricing[region]) {
                pricingSet.add(platform);
                for (const key in pricing[region][platform]) {
                    pricingSet.add(key);
                }
                for (const term in pricing[region][platform].reserved || {}) {
                    pricingSet.add(term);
                }
            }
        }
    }

    // Pass 2: Mutate the instances to use the rainbow table.
    const rainbowTable = Array.from(pricingSet);
    for (const instance of instances) {
        const pricing = instance.pricing;
        const newPricing: [
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
        ][] = [];
        for (const region in pricing) {
            const regionIndex = rainbowTable.indexOf(region);
            const platforms: [number, [number, any][]][] = [];
            for (const platform in pricing[region]) {
                const platformIndex = rainbowTable.indexOf(platform);
                const kv: [number, any][] = [];
                for (const key in pricing[region][platform]) {
                    const keyIndex = rainbowTable.indexOf(key);
                    if (key === "reserved") {
                        const reserved: [number, string][] = [];
                        for (const [key, value] of Object.entries(
                            pricing[region][platform].reserved || {},
                        )) {
                            reserved.push([rainbowTable.indexOf(key), value]);
                        }
                        kv.push([keyIndex, reserved]);
                    } else {
                        // @ts-expect-error: Doing some dangerous type stuff here.
                        kv.push([keyIndex, pricing[region][platform][key]]);
                    }
                }
                platforms.push([platformIndex, kv]);
            }
            newPricing.push([regionIndex, platforms]);
        }
        // @ts-expect-error: Doing some dangerous type stuff here.
        instance.pricing = newPricing;
    }
    return [rainbowTable, ...instances];
}
