import { decode } from "@msgpack/msgpack";
import { readFile } from "fs/promises";
import { XzReadableStream } from "xz-decompress";
import { Instance, Region } from "@/types";
import processRainbowTable from "@/utils/processRainbowTable";
import InstanceView from "./InstanceView";
import { PIPELINE_SIZE } from "@/utils/handleCompressedFile";

export const dynamic = "force-static";

let p: Promise<{ regions: Region; instances: Instance[] }>;

async function getData() {
    if (p) return p;
    p = (async () => {
        const regions = decode(
            await readFile("./public/instances-regions.msgpack"),
        ) as Region;
        const compressed30 = decode(
            await readFile("./public/first-30-instances.msgpack"),
        ) as Instance[];

        const remainingInstances: Instance[] = [];
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
            const remaining = decode(Buffer.concat(chunks)) as Instance[];
            // @ts-expect-error: The first item is the rainbow table.
            const rainbowTable: string[] = remaining.shift();
            remainingInstances.push(...remaining.map((i) =>
                processRainbowTable(rainbowTable, i),
            ));
        }
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
    return { instance, instances, initialPrices, regions };
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

function findNearestInstanceMutatesNoCleanup(instances: Instance[], closestTo: Instance) {
    instances.push(closestTo);
    instances.sort((a, b) => {
        // Sort by CPU, memory, and then GPU.
        if (a.vCPU !== b.vCPU) {
            return a.vCPU - b.vCPU;
        }
        if (a.memory !== b.memory) {
            return a.memory - b.memory;
        }
        return (a.GPU || 0) - (b.GPU || 0);
    });
    const ourInstance = instances.indexOf(closestTo);
    const left = instances[ourInstance - 1];
    const right = instances[ourInstance + 1];
    if (left && right) {
        // Try and find one equality here with the closest instance.
        if (left.vCPU === closestTo.vCPU || left.memory === closestTo.memory || (left.GPU || 0) === (closestTo.GPU || 0)) {
            return left;
        }
        if (right.vCPU === closestTo.vCPU || right.memory === closestTo.memory || (right.GPU || 0) === (closestTo.GPU || 0)) {
            return right;
        }

        // If this isn't possible, return the best of the two.
        return left.vCPU === right.vCPU && left.memory === right.memory ? left : right;
    }
    return left || right;
}

function bestInstanceForEachVariant(instances: Instance[], closestTo: Instance) {
    const variants: Map<string, Instance | Instance[]> = new Map();
    for (const instance of instances) {
        const [itype] = instance.instance_type.split(".", 2);
        let a = variants.get(itype);
        if (!a) {
            a = [];
            variants.set(itype, a);
        }
        (a as Instance[]).push(instance);
    }

    for (const [itype, instances] of variants.entries()) {
        if ((instances as Instance[]).includes(closestTo)) {
            variants.set(itype, closestTo);
        }
        const best = findNearestInstanceMutatesNoCleanup(instances as Instance[], closestTo);
        variants.set(itype, best);
    }

    const o: { [key: string]: string } = {};
    for (const [itype, instance] of variants.entries()) {
        o[itype] = (instance as Instance).instance_type;
    }
    return o;
}

export default async function Page({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { instance, instances, initialPrices } = await handleParams(params);
    const description = generateDescription(instance, initialPrices);

    const [itype] = instance.instance_type.split(".", 2);
    const variant = itype.slice(0, 2);
    const allOfVariant = instances.filter((i) => i.instance_type.startsWith(variant));
    const allOfInstanceType = instances.filter((i) => i.instance_type.startsWith(`${itype}.`)).map((i) => ({
        name: i.instance_type,
        cpus: i.vCPU,
        memory: i.memory || "N/A",
    }));

    return (
        <InstanceView
            instance={instance}
            description={description}
            bestOfVariants={bestInstanceForEachVariant(allOfVariant, instance)}
            allOfInstanceType={allOfInstanceType}
        />
    );
}
