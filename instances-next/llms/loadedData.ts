import { EC2Instance } from "@/types";
import { readFile } from "fs/promises";
import { XzReadableStream } from "xz-decompress";
import { decode } from "@msgpack/msgpack";
import processRainbowTable from "@/utils/processRainbowTable";
import { PIPELINE_SIZE } from "@/utils/handleCompressedFile";

export const awsInstances = (async () => {
    const compressed30 = decode(
        await readFile("./public/first-30-instances.msgpack"),
    ) as EC2Instance[];

    const remainingInstances: EC2Instance[] = [];
    for (let i = 0; i < PIPELINE_SIZE; i++) {
        const compressed = await readFile(
            `./public/remaining-instances-p${i}.msgpack.xz`,
        );
        const stream = new XzReadableStream(
            new ReadableStream({
                start(controller) {
                    controller.enqueue(compressed);
                    controller.close();
                },
            }),
        );
        const chunks: Uint8Array[] = [];
        const reader = stream.getReader();
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
        }
        const remaining = decode(Buffer.concat(chunks)) as EC2Instance[];
        // @ts-expect-error: The first item is the rainbow table.
        const rainbowTable: string[] = remaining.shift();
        remainingInstances.push(...remaining.map((i) =>
            processRainbowTable(rainbowTable, i),
        ));
    }
    // @ts-expect-error: The first item is the rainbow table.
    const first30RainbowTable: string[] = compressed30.shift();
    return [
        ...compressed30.map((i) =>
            processRainbowTable(first30RainbowTable, i),
        ),
        ...remainingInstances,
    ];
})();

export async function getAwsFamilies() {
    const instances = await awsInstances;
    const families = new Set<string>();
    for (const instance of instances) {
        families.add(instance.instance_type.split(".")[0]);
    }
    return Array.from(families).sort();
}
