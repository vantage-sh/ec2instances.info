import { expect, test, describe } from "vitest";
import {
    PIPELINE_SIZE,
    default as handleCompressedFile,
} from "./handleCompressedFile";

function injectLocationAndWindow(name: string, handler: () => void) {
    test(name, () => {
        const originalWindow = global.window;
        global.window = {
            location: {
                protocol: "https:",
                host: "example.com",
                pathname: "/",
            },
        } as any;

        try {
            handler();
        } finally {
            global.window = originalWindow;
        }
    });
}

injectLocationAndWindow("no Worker support", () => {
    const result = handleCompressedFile("https://example.com/{}.msgpack.xz", [
        1,
    ]);
    expect(result.value).toEqual([1]);
    let count = 0;
    result.addChangeNotifier(() => count++);
    expect(count).toBe(0);
});

type MockWorkers = {
    url: URL;
    pushMessage: (data: any) => void;
    recievedMessages: any[];
    terminated?: boolean;
}[];

function injectMockWorker(handler: (workers: MockWorkers) => void) {
    const originalWorker = global.Worker;

    const workers: MockWorkers = [];
    class MockWorker {
        private _worker: MockWorkers[number];
        private _events: ((ev: MessageEvent) => void)[] = [];

        constructor(url: URL) {
            const pushMessage = (message: any) => {
                for (const event of this._events) {
                    event({ data: message } as any);
                }
            };
            this._worker = { url, pushMessage, recievedMessages: [] };
            workers.push(this._worker);
        }

        postMessage(message: any) {
            this._worker.recievedMessages.push(message);
        }

        set onmessage(handler: (ev: MessageEvent) => void) {
            this._events.push(handler);
        }

        terminate() {
            this._worker.terminated = true;
        }
    }

    global.Worker = MockWorker as any;
    window.Worker = MockWorker as any;
    try {
        handler(workers);
    } finally {
        global.Worker = originalWorker;
    }
}

function baseWorkerTest(
    name: string,
    path: string,
    tester: (
        handler: ReturnType<typeof handleCompressedFile>,
        workers: MockWorkers,
    ) => void,
) {
    injectLocationAndWindow(name, () => {
        injectMockWorker((workers) => {
            const handler = handleCompressedFile(path, [1]);
            expect(handler.value).toEqual([1]);
            expect(workers.length).toBe(
                path.includes("{}") ? PIPELINE_SIZE : 1,
            );
            for (let i = 0; i < workers.length; i++) {
                const worker = workers[i];
                const url = `https://example.com${path.replace("{}", i.toString())}`;
                expect(worker.url.toString()).toBe(
                    new URL(
                        "./workers/processor.worker.ts",
                        import.meta.url,
                    ).toString(),
                );
                expect(worker.recievedMessages).toEqual([{ url }]);
                expect(worker.terminated).toBeUndefined();
            }
            tester(handler, workers);
        });
    });
}

describe("Worker support", () => {
    baseWorkerTest("no {} in path", "/1.msgpack.xz", (handler, workers) => {
        const worker = workers[0];
        let count = 0;
        handler.addChangeNotifier(() => {
            count++;
            expect(handler.value).toEqual([1, 2, 3, 4]);
        });
        worker.pushMessage([2, 3, 4]);
        expect(count).toBe(1);
        expect(worker.terminated).toBe(true);
    });

    baseWorkerTest("{} in path", "/{}.msgpack.xz", (handler, workers) => {
        let count = 0;
        handler.addChangeNotifier(() => count++);

        // Test out of order execution
        workers[2].pushMessage([2]);
        expect(handler.value).toEqual([1, 2]);
        expect(workers[2].terminated).toBe(true);
        workers[1].pushMessage([1]);
        expect(count).toBe(2);
        expect(handler.value).toEqual([1, 1, 2]);
        expect(workers[1].terminated).toBe(true);

        // Test multiple values
        workers[0].pushMessage([-1, 0]);
        expect(count).toBe(3);
        const all = [1, -1, 0, 1, 2];
        expect(handler.value).toEqual(all);
        expect(workers[0].terminated).toBe(true);

        // Handle making sure the rest set properly
        for (let i = 3; i < workers.length; i++) {
            all.push(i);
        }
        for (let i = 3; i < workers.length; i++) {
            const worker = workers[i];
            worker.pushMessage([i]);
            expect(worker.terminated).toBe(true);
        }
        expect(count).toBe(all.length - 2);
    });
});
