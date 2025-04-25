import { Instance, Region } from "@/types";
import { decode } from "@msgpack/msgpack";
import { XzReadableStream } from "xz-decompress";

export default async function handleCompressedFile(path: string) {
    const res = await fetch(path);
    if (!res.ok) {
        throw new Error(`Failed to fetch compressed file: ${path}`);
    }
    const buffer = await res.arrayBuffer();
    const [compressedInstances, regions] = decode(buffer) as [
        Uint8Array,
        Region,
    ];

    // Decompress the instances.
    const blob = new Blob([compressedInstances]);
    const s = new XzReadableStream(blob.stream());
    const reader = s.getReader();
    let chunks: Uint8Array[] = [];
    let totalLength = 0;
    while (true) {
        const result = await reader.read();
        if (result.done) {
            break;
        }
        chunks.push(result.value!);
        totalLength += result.value!.length;
    }
    const a = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
        a.set(chunk, offset);
        offset += chunk.length;
    }
    const instances = decode(a) as Instance[];

    return {
        instances,
        regions,
    };
}
