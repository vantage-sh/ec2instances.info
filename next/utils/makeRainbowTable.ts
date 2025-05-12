export default function makeRainbowTable<
    Instance extends { pricing: Record<string, Record<string, any>> },
>(instances: Instance[]) {
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
                (
                    | [
                          // Key inside platform
                          number,
                          any,
                      ][]
                    | [number, number]
                ),
            ][],
        ][] = [];
        const previousReserved = new Map<string, [number, number]>();
        for (const region in pricing) {
            const regionIndex = rainbowTable.indexOf(region);
            const platforms: [number, [number, any][] | [number, number]][] =
                [];
            for (const platform in pricing[region]) {
                // Check if we already have a platform with this pricing.
                const platformIndex = rainbowTable.indexOf(platform);
                const stringified = JSON.stringify(pricing[region][platform]);
                const previousRef = previousReserved.get(stringified);
                if (previousRef) {
                    platforms.push([platformIndex, previousRef]);
                    continue;
                }

                // Do the compression and then add write that data to our table.
                const kv: [number, any][] = [];
                for (const key in pricing[region][platform]) {
                    const keyIndex = rainbowTable.indexOf(key);
                    if (key === "reserved") {
                        const reserved: [number, string][] = [];
                        for (const [key, value] of Object.entries(
                            pricing[region][platform].reserved || {},
                        )) {
                            // @ts-expect-error: We know what to expect here.
                            reserved.push([rainbowTable.indexOf(key), value]);
                        }
                        kv.push([keyIndex, reserved]);
                    } else {
                        kv.push([keyIndex, pricing[region][platform][key]]);
                    }
                }
                platforms.push([platformIndex, kv]);
                previousReserved.set(stringified, [regionIndex, platformIndex]);
            }
            newPricing.push([regionIndex, platforms]);
        }
        // @ts-expect-error: Doing some dangerous type stuff here.
        instance.pricing = newPricing;
    }
    return [rainbowTable, ...instances];
}
