import { Instance, Pricing } from "@/types";
import { decodeArrayStream } from "@msgpack/msgpack";
import { XzReadableStream } from "xz-decompress";

// If you edit this, edit processRainbowTable.ts as well. I know this is ugly, but it needs to be
// there for the inlining to work.
function processRainbowTable(
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

onmessage = async (e) => {
    const { url }: { url: string } = e.data;

    const res = await fetch(url);
    if (!res.ok) {
        throw new Error(`Failed to fetch compressed file: ${url}`);
    }

    // Decompress the instances.
    const s = new XzReadableStream(res.body!);
    let instancesBuffer: Instance[] = [];
    let pricingRainbowTable: Map<number, string> | null = null;
    try {
        for await (const item of decodeArrayStream(s)) {
            if (pricingRainbowTable === null) {
                const arr = item as string[];
                pricingRainbowTable = new Map<number, string>();
                for (let i = 0; i < arr.length; i++) {
                    pricingRainbowTable.set(i, arr[i]);
                }
                continue;
            }
            instancesBuffer.push(
                processRainbowTable(pricingRainbowTable, item as Instance),
            );
            if (instancesBuffer.length === 50) {
                postMessage(instancesBuffer);
                instancesBuffer = [];
            }
        }
    } catch {
        // At the end it throws an error for some reason. It does get all
        // the instances though, so I'm not too worried.
    }
    if (instancesBuffer.length > 0) postMessage(instancesBuffer);
    postMessage(null);
};
