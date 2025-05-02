import { Instance } from "@/types";
import { unpackedAtom } from "@/state";

export default function handleCompressedFile(
    path: string,
    instances: Instance[],
) {
    if (!window.Worker) {
        return {
            get value() {
                return instances;
            },
            addChangeNotifier: (fn: () => void) => {
                return () => {};
            },
        };
    }

    const worker = new Worker(
        new URL("./compression.worker.ts", import.meta.url),
        {
            type: "module",
        },
    );

    unpackedAtom.set(false);
    const changeNotifier = new Set<() => void>();
    worker.onmessage = (e) => {
        const newInstances = e.data as Instance[] | null;
        if (!newInstances) {
            worker.terminate();
            unpackedAtom.set(true);
            return;
        }
        instances = [...instances, ...newInstances];
        for (const fn of changeNotifier) {
            fn();
        }
    };

    worker.postMessage({
        url: new URL(
            path,
            `${window.location.protocol}//${window.location.host}`,
        ).href,
    });

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
