import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { compress } from "lzma-native";
import { expect, test } from "vitest";

const oneHundredKb = Buffer.alloc(1024 * 100);
for (let i = 0; i < oneHundredKb.length; i++) {
    oneHundredKb[i] = Math.random() * 256;
}

const restHandlers = [
    http.get("https://example.com/content.msgpack.xz", async () => {
        const compressed = new Promise<Buffer>((resolve) => {
            return compress(oneHundredKb, {}, (result) => resolve(result));
        });
        const toArrayBuffer = (buffer: Buffer) => {
            const arrayBuffer = new ArrayBuffer(buffer.length);
            const view = new Uint8Array(arrayBuffer);
            view.set(buffer);
            return arrayBuffer;
        };
        return HttpResponse.arrayBuffer(toArrayBuffer(await compressed));
    }),
];

test("successful decompresion", async () => {
    // Setup server
    const server = setupServer(...restHandlers);
    server.listen({ onUnhandledRequest: "error" });
    const chunks: Uint8Array[] = [];
    let res: () => void;
    const promise = new Promise<void>((resolve) => {
        res = resolve;
    });
    let handler: typeof global.onmessage;

    function postMessageHandler(message: any, transfer?: any[]) {
        if (message === null) {
            expect(transfer).toBeUndefined();
            res();
        } else {
            chunks.push(message);
            expect(transfer?.length).toBe(1);
        }
    }

    // Handle calling the worker
    async function callWorker(e: MessageEvent) {
        const originalPostMessage = global.postMessage;
        try {
            if (!handler) {
                throw new Error("Handler not set");
            }
            // @ts-expect-error: The signature is different.
            global.postMessage = postMessageHandler;
            // @ts-expect-error: We don't use this, this is fine.
            await handler.call(global, e);
        } finally {
            global.postMessage = originalPostMessage;
        }
    }

    try {
        // Mock the message handler
        const originalOnMessage = global.onmessage;
        global.onmessage = null;
        await import("./compression.worker");
        handler = global.onmessage;
        global.onmessage = originalOnMessage;

        // Call the worker
        const messageLikeEnough = (data: any): MessageEvent => {
            return { data } as any;
        };
        callWorker(
            messageLikeEnough({
                url: "https://example.com/content.msgpack.xz",
            }),
        );
        await promise;
        const buffer = Buffer.concat(chunks);
        expect(buffer).toEqual(oneHundredKb);
    } finally {
        server.close();
    }
});
