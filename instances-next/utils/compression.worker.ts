import { Instance } from "@/types";
import { decodeArrayStream } from "@msgpack/msgpack";
import { XzReadableStream } from "xz-decompress";

onmessage = async (e) => {
    const { url }: { url: string } = e.data;

    const res = await fetch(url);
    if (!res.ok) {
        throw new Error(`Failed to fetch compressed file: ${url}`);
    }

    // Decompress the instances.
    const s = new XzReadableStream(res.body!);
    let instancesBuffer: Instance[] = [];
    try {
        for await (const item of decodeArrayStream(s)) {
            instancesBuffer.push(item as Instance);
            if (instancesBuffer.length === 50) {
                postMessage(instancesBuffer);
                instancesBuffer = [];
            }
        }
    } catch {
        // At the end it throws an error for some reason. It does get all
        // the instances though, so I'm not too worried.
    }
    if (instancesBuffer.length > 0) postMessage(instancesBuffer);
    postMessage(null);
};
