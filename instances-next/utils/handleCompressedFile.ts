import { Instance } from "@/types";
import { decodeArrayStream } from "@msgpack/msgpack";
import { XzReadableStream } from "xz-decompress";

export default function handleCompressedFile(path: string, instances: Instance[]) {
    const changeNotifier = new Set<() => void>();

    (async () => {
        const res = await fetch(path);
        if (!res.ok) {
            throw new Error(`Failed to fetch compressed file: ${path}`);
        }

        // Decompress the instances.
        const s = new XzReadableStream(res.body!);
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
