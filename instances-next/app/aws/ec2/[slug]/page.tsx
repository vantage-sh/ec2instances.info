import { decode } from "@msgpack/msgpack";
import { readFile } from "fs/promises";
import { XzReadableStream } from "xz-decompress";
import { Instance, Region } from "@/types";
import processRainbowTable from "@/utils/processRainbowTable";

let p: Promise<{ regions: Region; instances: Instance[] }>;

async function getData() {
    if (p) return p;
    p = (async () => {
        const regions = decode(
            await readFile("./public/instances-regions.msgpack"),
        ) as Region;
        const compressed50 = decode(
            await readFile("./public/first-50-instances.msgpack"),
        ) as Instance[];


        const remainingCompressed = await readFile(
            "./public/remaining-instances.msgpack.xz",
        );
        const stream = new XzReadableStream(
            new ReadableStream({
                start(controller) {
                    controller.enqueue(remainingCompressed);
                    controller.close();
                },
            }),
        );
        const buffers: Uint8Array[] = [];
        const reader = stream.getReader();
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffers.push(value);
        }
        const remaining = decode(Buffer.concat(buffers)) as Instance[];
        // @ts-expect-error: The first item is the rainbow table.
        const first50RainbowTable: string[] = compressed50.shift();
        // @ts-expect-error: The first item is the rainbow table.
        const remainingPricingRainbowTable: string[] = remaining.shift();
        return {
            regions,
            instances: [
                ...compressed50.map((i) =>
                    processRainbowTable(first50RainbowTable, i),
                ),
                ...remaining.map((i) =>
                    processRainbowTable(remainingPricingRainbowTable, i),
                ),
            ],
        };
    })();
    return p;
}

function initial_prices(instance: Instance) {
    const init_p = { ondemand: 0, spot: 0, _1yr: 0, _3yr: 0 };
    for (const pricing_type of ["ondemand", "spot", "_1yr", "_3yr"]) {
        for (const os of ["linux", "dedicated"]) {
            try {
                if (pricing_type.includes("yr")) {
                    // @ts-expect-error: Trusting this because its from the python code.
                    init_p[pricing_type] =
                        // @ts-expect-error: Trusting this because its from the python code.
                        instance.pricing["us-east-1"][os][pricing_type][
                            "Standard.noUpfront"
                        ];
                } else {
                    // @ts-expect-error: Trusting this because its from the python code.
                    init_p[pricing_type] =
                        // @ts-expect-error: Trusting this because its from the python code.
                        instance.pricing["us-east-1"][os][pricing_type];
                }
                break;
            } catch (e) {
                // @ts-expect-error: Trusting this because its from the python code.
                init_p[pricing_type] = "'N/A'";
            }
        }
    }
    return init_p;
}

type InitialPrices = ReturnType<typeof initial_prices>;

export async function generateStaticParams() {
    const { instances } = await getData();
    return instances.map((instance) => ({
        slug: instance.instance_type,
    }));
}

const LOW_MEDIUM_HIGH = /(low|moderate|high)/gi;

function generateDescription(instance: Instance, initialPrices: InitialPrices) {
    let bw = "";
    if (instance.network_performance.match(LOW_MEDIUM_HIGH)) {
        bw = ` and ${instance.network_performance.toLowerCase()} network performance`;
    } else {
        bw = ` and ${instance.network_performance.replace("Gigabit", "").trim()} Gibps of bandwidth`;
    }
    return `The ${instance.instance_type} instance is in the ${instance.instance_type.split(".")[0]} family with ${instance.vCPU} vCPUs, ${instance.memory} GiB of memory${bw} starting at $${initialPrices.ondemand} per hour.`;
}

async function handleParams(params: Promise<{ slug: string }>) {
    const { slug } = await params;
    const { instances, regions } = await getData();
    const instance = instances.find((i) => i.instance_type === slug)!;
    const initialPrices = initial_prices(instance);
    return { instance, initialPrices, regions };
}

export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { instance, initialPrices } = await handleParams(params);
    return {
        title: `${instance.instance_type} pricing and specs - Vantage`,
        description: generateDescription(instance, initialPrices),
    };
}

export default async function Page({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { instance, initialPrices } = await handleParams(params);
    const description = generateDescription(instance, initialPrices);

    return description;
}
