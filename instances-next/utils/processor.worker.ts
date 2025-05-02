import { Instance } from "@/types";
import { decodeArrayStream } from "@msgpack/msgpack";
import processRainbowTable from "./processRainbowTable";

let listeners: Set<() => void> | null = new Set();
const chunks: Uint8Array[] = [];

async function waitForDataChunk() {
    if (chunks.length > 0) return chunks.shift()!;
    return new Promise<Uint8Array | undefined>((resolve) => {
        listeners ? listeners.add(() => resolve(chunks.shift())) : resolve(undefined);
    });
}

class Stream {
    private controller: ReadableStreamDefaultController<Uint8Array> | null = null;

    constructor() {
        this.stream = new ReadableStream<Uint8Array>({
            start: (controller) => {
                this.controller = controller;
            },
            pull: async (controller) => {
                const chunk = await waitForDataChunk();
                if (chunk) {
                    controller.enqueue(chunk);
                } else {
                    controller.close();
                }
            },
            cancel: () => {
                this.controller = null;
            },
        });
    }

    public stream: ReadableStream<Uint8Array>;

    enqueue(chunk: Uint8Array) {
        if (this.controller) {
            this.controller.enqueue(chunk);
        }
    }

    close() {
        if (this.controller) {
            this.controller.close();
        }
    }
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

    // Decompress the instances.
    const s = new Stream().stream;
    let instancesBuffer: Instance[] = [];
    let pricingRainbowTable: Map<number, string> | null = null;
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
    if (instancesBuffer.length > 0) postMessage(instancesBuffer);
    postMessage(null);
};
