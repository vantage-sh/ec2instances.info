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
    const pipeline: Instance[][] = Array(PIPELINE_SIZE).fill([]);
    const changeNotifier = new Set<() => void>();
    for (let i = 0; i < PIPELINE_SIZE; i++) {
        const worker = new Worker(
            new URL("./processor.worker.ts", import.meta.url),
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
