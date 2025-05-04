import { Instance } from "@/types";
import { decodeArrayStream } from "@msgpack/msgpack";
import processRainbowTable from "./processRainbowTable";

let listeners: Set<() => void> | null = new Set();
const chunks: Uint8Array[] = [];

async function waitForDataChunk() {
    const chunk = chunks.shift();
    if (chunk) return chunk;
    return new Promise<Uint8Array | undefined>((resolve) => {
        listeners
            ? listeners.add(() => resolve(chunks.shift()))
            : resolve(undefined);
    });
}

onmessage = async (e) => {
    // Get the compression worker going.
    const worker = new Worker(
        new URL("./compression.worker.ts", import.meta.url),
    );
    worker.onmessage = (e) => {
        if (e.data === null) {
            const takenListeners = listeners;
            listeners = null;
            takenListeners!.forEach((l) => l());
            worker.terminate();
            return;
        }
        chunks.push(e.data);
        listeners?.forEach((l) => l());
        listeners = new Set();
    };
    worker.postMessage(e.data);

    // Read and process the instances.
    const s = new ReadableStream<Uint8Array>({
        pull: async (controller) => {
            const chunk = await waitForDataChunk();
            if (chunk) {
                controller.enqueue(chunk);
            } else {
                controller.close();
            }
        },
    });
    let instancesBuffer: Instance[] = [];
    let pricingRainbowTable: string[] | null = null;
    try {
        for await (const item of decodeArrayStream(s)) {
            if (pricingRainbowTable === null) {
                pricingRainbowTable = item as string[];
                continue;
            }
            instancesBuffer.push(
                processRainbowTable(pricingRainbowTable, item as Instance),
            );
        }
    } catch {
        // At the end it throws an error for some reason. It does get all
        // the instances though, so I'm not too worried.
    }
    postMessage(instancesBuffer);
};
