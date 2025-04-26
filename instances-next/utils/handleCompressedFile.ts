import { Instance } from "@/types";

export default function handleCompressedFile(path: string, instances: Instance[]) {
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

    const worker = new Worker(new URL("./compression.worker.ts", import.meta.url), {
        type: "module",
    });

    const changeNotifier = new Set<() => void>();
    worker.onmessage = (e) => {
        const newInstances = e.data as Instance[] | null;
        if (!newInstances) {
            worker.terminate();
            return;
        }
        instances = [...instances, ...newInstances];
        for (const fn of changeNotifier) {
            fn();
        }
    };

    worker.postMessage({
        url: new URL(path, `${window.location.protocol}//${window.location.host}`).href,
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
