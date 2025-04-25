import { Instance } from "@/types";
import { decodeArrayStream } from "@msgpack/msgpack";
import { XzReadableStream } from "xz-decompress";

const flat = Symbol("flat");

function flatPromise<T>(): [
    (value: T) => void,
    (reason?: any) => void,
    Promise<T>
] {
    let rejection: T | typeof flat = flat;
    let fulfillment: T | typeof flat = flat;
    const handlers = new Set<() => void>();
    const promiseLike: PromiseLike<T> = {
        // @ts-expect-error: This is just a mind numbing error. I don't need to fix it for this,
        // so I won't.
        then(onfulfilled, onrejected) {
            if (rejection !== flat) {
                return Promise.reject(rejection).then(onfulfilled, onrejected);
            }
            if (fulfillment !== flat) {
                return Promise.resolve(fulfillment).then(onfulfilled, onrejected);
            }
            return new Promise<T>((resolve, reject) => {
                handlers.add(() => {
                    if (fulfillment !== flat) {
                        resolve(fulfillment);
                    }
                    if (rejection !== flat) {
                        reject(rejection);
                    }
                });
            });
        },
    };
    const promise = (async () => {
        return await promiseLike;
    })();
    return [
        (value: T) => {
            fulfillment = value;
            for (const fn of handlers) {
                fn();
            }
        },
        (reason?: any) => {
            rejection = reason;
            for (const fn of handlers) {
                fn();
            }
        },
        promise,
    ];
}

class AsyncPrePull {
    private _pulledChunks: Uint8Array[] = [];
    private _readPromise: Promise<Uint8Array | undefined>;

    constructor(body: ReadableStream) {
        let [resolver, rejecter, p] = flatPromise<Uint8Array | undefined>();
        this._readPromise = p;
        const reader = body.getReader();
        (async () => {
            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) {
                        resolver(undefined);
                        break;
                    }
                    this._pulledChunks.push(value);
                    resolver(value);
                    [resolver, rejecter, p] = flatPromise<Uint8Array | undefined>();
                    this._readPromise = p;
                }
            } catch (e) {
                rejecter(e);
            }
        })();
    }

    getReader() {
        return this;
    }

    async read() {
        let v = this._pulledChunks.shift();
        if (!v) {
            // Wait for the next chunk.
            v = await this._readPromise;
        }
        return {
            done: v === undefined,
            value: v || new Uint8Array(),
        } as const;
    }
}

export default function handleCompressedFile(path: string, instances: Instance[]) {
    const changeNotifier = new Set<() => void>();

    (async () => {
        const res = await fetch(path);
        if (!res.ok) {
            throw new Error(`Failed to fetch compressed file: ${path}`);
        }

        // Decompress the instances.
        // @ts-expect-error: This isn't strictly ReadableStream compliant, but it is close enough.
        const s = new XzReadableStream(new AsyncPrePull(res.body!));
        let instancesBuffer: Instance[] = [];
        try {
            for await (const item of decodeArrayStream(s)) {
                instancesBuffer.push(item as Instance);
                if (instancesBuffer.length === 30) {
                    instances = [...instances, ...instancesBuffer];
                    instancesBuffer = [];
                    setTimeout(() => {
                        for (const fn of changeNotifier) {
                            fn();
                        }
                    }, 0);
                }
            }
        } catch {
            // At the end it throws an error for some reason. It does get all
            // the instances though, so I'm not too worried.
        }
        if (instancesBuffer.length > 0) {
            instances = [...instances, ...instancesBuffer];
            setTimeout(() => {
                for (const fn of changeNotifier) {
                    fn();
                }
            }, 0);
        }
    })();

    return {
        get value() {
            return instances;
        },
        addChangeNotifier: (fn: () => void) => {
            changeNotifier.add(fn);
            return () => changeNotifier.delete(fn);
        },
    };
}
