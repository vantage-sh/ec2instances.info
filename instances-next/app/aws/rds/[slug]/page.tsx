import { EC2Instance, Region } from "@/types";
import processRainbowTable from "@/utils/processRainbowTable";
import { decode } from "@msgpack/msgpack";
import { readFile } from "fs/promises";
import { XzReadableStream } from "xz-decompress";

export const dynamic = "force-static";

let p: Promise<{ regions: Region; instances: EC2Instance[] }>;

async function getData() {
    if (p) return p;
    p = (async () => {
        const regions = decode(
            await readFile("./public/instance-rds-regions.msgpack"),
        ) as Region;
        const compressed30 = decode(
            await readFile("./public/first-30-rds-instances.msgpack"),
        ) as EC2Instance[];

        const compressed = await readFile("./public/remaining-rds-instances.msgpack.xz");
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
        const remainingInstances = remaining.map((i) =>
            processRainbowTable(rainbowTable, i),
        );
        // @ts-expect-error: The first item is the rainbow table.
        const first30RainbowTable: string[] = compressed30.shift();
        return {
            regions,
            instances: [
                ...compressed30.map((i) =>
                    processRainbowTable(first30RainbowTable, i),
                ),
                ...remainingInstances,
            ],
        };
    })();
    return p;
}

export async function generateStaticParams() {
    const { instances } = await getData();
    return instances.map((instance) => ({
        slug: instance.instance_type,
    }));
}


export default async function Page({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    return null;
}
