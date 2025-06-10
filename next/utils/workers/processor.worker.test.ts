import { expect, test } from "vitest";
import { readFile } from "fs/promises";
import { join } from "path";
import instances from "./mocks/azure-instances-roughly-10-jun-2025.json";

const fp = join(
    __dirname,
    "mocks",
    "azure-instances-roughly-10-jun-2025.msgpack",
);

test("successful processing of content", async () => {
    // Make a mock worker
    let ranOnce = false;
    let terminated = false;
    class MockWorker {
        onmessage: ((message: any) => void) | null = null;
        private postMessageRan = false;

        constructor(url: URL) {
            if (ranOnce)
                throw new Error("MockWorker can only be instantiated once");
            ranOnce = true;
            expect(url.toString()).toBe(
                new URL("./compression.worker.ts", import.meta.url).toString(),
            );
        }

        terminate() {
            if (terminated) throw new Error("MockWorker already terminated");
            terminated = true;
        }

        postMessage(message: any) {
            if (this.postMessageRan)
                throw new Error("MockWorker can only be instantiated once");
            this.postMessageRan = true;
            expect(message).toEqual({
                url: "https://example.com/content.msgpack.xz",
            });
            const ourThis = this;
            readFile(fp).then((data) => {
                const chunkCount = 100;
                const chunkSize = data.length / chunkCount;
                for (let i = 0; i < chunkCount; i++) {
                    ourThis.onmessage?.({
                        data: data.slice(i * chunkSize, (i + 1) * chunkSize),
                    });
                }
                ourThis.onmessage?.({ data: null });
            });
        }
    }

    // patch postMessage
    const originalPostMessage = global.postMessage;
    const workerPosting = new Promise<any>((resolve) => {
        global.postMessage = resolve;
    });

    // Handle onmessage
    const originalOnmessage = global.onmessage;
    global.onmessage = null;

    // Patch Worker
    const originalWorker = global.Worker;
    // @ts-expect-error: We only patch part of this
    global.Worker = MockWorker;

    try {
        // Await the import.
        await import("./processor.worker");
        const workerOnmessage = global.onmessage;
        global.onmessage = originalOnmessage;

        // Call onmessage
        // @ts-expect-error: Node uses another signature
        workerOnmessage?.({
            data: {
                url: "https://example.com/content.msgpack.xz",
            },
        });

        // Await the worker posting
        const result = await workerPosting;
        expect(result).toEqual(instances);
    } finally {
        // Restore from the patch
        global.postMessage = originalPostMessage;
        global.onmessage = originalOnmessage;
        global.Worker = originalWorker;
    }
});
