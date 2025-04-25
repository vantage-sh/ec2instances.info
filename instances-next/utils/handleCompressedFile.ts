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
                if (instancesBuffer.length === 100) {
                    instances = [...instances, ...instancesBuffer];
                    instancesBuffer = [];
                    changeNotifier.forEach((fn) => fn());
                }
            }
        } catch {
            // At the end it throws an error for some reason. It does get all
            // the instances though, so I'm not too worried.
        }
        if (instancesBuffer.length > 0) {
            instances = [...instances, ...instancesBuffer];
            changeNotifier.forEach((fn) => fn());
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
