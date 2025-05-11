export function makeHalfRainbowTable<
    Instance extends {
        pricing: {
            [region: string]: {
                ondemand: any;
                reserved?: {
                    [term: string]: any;
                };
            };
        };
    },
>(instances: Instance[]): [string[], ...Instance[]] {
    // Pass 1: Get all the keys.
    const reservedSet = new Set<string>();
    for (const instance of instances) {
        for (const region in instance.pricing) {
            for (const platform in instance.pricing[region].reserved || {}) {
                reservedSet.add(platform);
            }
            reservedSet.add(region);
        }

        // @ts-expect-error: We don't need this and if it exists it is HUGE
        delete instance.regions;
    }

    // Pass 2: Mutate the instances to use the rainbow table.
    const rainbowTable = Array.from(reservedSet);
    for (const instance of instances) {
        const newPricing: [number, [any, ...[number, any][]]][] = [];
        for (const region in instance.pricing) {
            const compressed: [any, ...[number, any][]] = [
                instance.pricing[region].ondemand,
            ];
            for (const reservedKey in instance.pricing[region].reserved || {}) {
                const index = rainbowTable.indexOf(reservedKey);
                if (index === -1) {
                    throw new Error(
                        `Reserved key ${reservedKey} not found in rainbow table`,
                    );
                }
                compressed.push([
                    index,
                    instance.pricing[region].reserved![reservedKey],
                ]);
            }
            newPricing.push([rainbowTable.indexOf(region), compressed]);
        }
        // @ts-expect-error: We know the type is wrong now.
        instance.pricing = newPricing;
    }
    return [rainbowTable, ...instances];
}

export function decompressHalfRainbowTable<
    Instance extends {
        pricing: {
            [region: string]: {
                ondemand: any;
                reserved?: {
                    [term: string]: any;
                };
            };
        };
    },
>(rainbowTable: string[], instance: Instance) {
    // @ts-expect-error: We know the type is wrong now.
    if (instance._decmp) return instance;
    // @ts-expect-error: The type is currently wrong.
    const compressedPricing: [number, [any, ...[number, any][]]][] =
        instance.pricing;
    const newPricing: Record<string, any> = {};
    for (const [regionIndex, compressed] of compressedPricing) {
        const region = rainbowTable[regionIndex];
        const ondemand: any = compressed.shift();
        const reserved: { [term: string]: any } = {};
        for (const [index, value] of compressed) {
            reserved[rainbowTable[index]] = value;
        }
        newPricing[region] = { ondemand, reserved };
    }
    instance.pricing = newPricing;
    // @ts-expect-error: We know the type is wrong now.
    instance._decmp = true;
    return instance;
}
