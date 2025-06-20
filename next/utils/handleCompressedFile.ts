export const PIPELINE_SIZE = 10;

export default function handleCompressedFile<Instance>(
    pathFormatString: string,
    initialInstances: Instance[],
) {
    if (!window.Worker) {
        return {
            get value() {
                return initialInstances;
            },
            addChangeNotifier: () => {
                return () => {};
            },
        };
    }

    let instances = initialInstances;
    const changeNotifier = new Set<() => void>();

    const o = {
        get value() {
            return instances;
        },
        addChangeNotifier: (fn: () => void) => {
            changeNotifier.add(fn);
            return () => changeNotifier.delete(fn);
        },
    };

    if (!pathFormatString.includes("{}")) {
        // If this isn't a pipeline, we can just use a single worker.
        const worker = new Worker(
            new URL("./workers/processor.worker.ts", import.meta.url),
        );
        worker.onmessage = (e) => {
            instances = [...initialInstances, ...(e.data as Instance[])];
            for (const fn of changeNotifier) {
                fn();
            }
            worker.terminate();
        };
        const url = new URL(
            pathFormatString,
            `${window.location.protocol}//${window.location.host}`,
        ).href;
        worker.postMessage({ url });
        return o;
    }

    const pipeline: Instance[][] = Array(PIPELINE_SIZE).fill([]);
    for (let i = 0; i < PIPELINE_SIZE; i++) {
        const worker = new Worker(
            new URL("./workers/processor.worker.ts", import.meta.url),
        );
        const thisPipelineIndex = i;
        worker.onmessage = (e) => {
            pipeline[thisPipelineIndex] = e.data as Instance[];
            instances = [...initialInstances, ...pipeline.flat()];
            for (const fn of changeNotifier) {
                fn();
            }
            worker.terminate();
        };
        const url = new URL(
            pathFormatString.replace("{}", i.toString()),
            `${window.location.protocol}//${window.location.host}`,
        ).href;
        worker.postMessage({ url });
    }

    return o;
}
