import { Instance } from "@/types";
import { decodeArrayStream } from "@msgpack/msgpack";
import { XzReadableStream } from "xz-decompress";
import processRainbowTable from "./processRainbowTable";

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
            instancesBuffer.push(processRainbowTable(pricingRainbowTable, item as Instance));
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
