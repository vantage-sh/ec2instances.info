import EC2InstanceRoot from "@/components/EC2InstanceRoot";
import { EC2Instance, Region } from "@/types";
import bestEc2InstanceForEachVariant from "@/utils/bestEc2InstanceForEachVariant";
import makeRainbowTable from "@/utils/makeRainbowTable";
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
            ].map((x) => {
                if ("vcpu" in x) {
                    // @ts-expect-error: This is a different typed field.
                    x.vCPU = x.vcpu;
                    delete x.vcpu;
                }
                return x;
            }),
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

async function handleParams(params: Promise<{ slug: string }>) {
    const { slug } = await params;
    const { instances, regions } = await getData();
    const instance = instances.find((i) => i.instance_type === slug)!;
    let ondemandCost: string | undefined;
    if (instance.instance_type.includes("mem")) {
        ondemandCost = instance.pricing["us-east-1"]?.Oracle?.ondemand;
    } else if (instance.instance_type.includes("z1d")) {
        ondemandCost = instance.pricing["us-east-1"]?.["SQL Server"]?.ondemand;
    } else {
        ondemandCost = instance.pricing["us-east-1"]?.PostgreSQL?.ondemand;
    }
    return { instance, instances, ondemandCost, regions };
}

function generateDescription(instance: any, ondemandCost: string | undefined) {
    return `The ${instance.instance_type} instance is a ${instance.family} instance with ${instance.vCPU} vCPUs and ${instance.memory}GB of memory starting at $${ondemandCost} per hour.`;
}

export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { instance, ondemandCost } = await handleParams(params);
    return {
        title: `${instance.instance_type} pricing and specs - Vantage`,
        description: generateDescription(instance, ondemandCost),
    };
}

const osOptions: [string, string][] = [
    ["PostgreSQL", "PostgreSQL"],
    ["MySQL", "MySQL"],
    ["Oracle", "Oracle"],
    ["SQL Server", "SQL Server"],
];

export default async function Page({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { instance, instances, ondemandCost, regions } = await handleParams(params);
    const description = generateDescription(instance, ondemandCost);

    const [db, itype] = instance.instance_type.split(".", 3);
    const variant = itype.slice(0, 2);
    const allOfVariant = instances.filter((i) => i.instance_type.startsWith(`${db}.${variant}`));
    const allOfInstanceType = instances.filter((i) => i.instance_type.startsWith(`${db}.${itype}.`)).map((i) => ({
        name: i.instance_type,
        cpus: i.vCPU,
        memory: i.memory || "N/A",
    }));

    const compressedInstance = makeRainbowTable([{ ...instance }]);

    return (
        <EC2InstanceRoot
            rainbowTable={compressedInstance[0] as string[]}
            compressedInstance={compressedInstance[1] as EC2Instance}
            regions={regions}
            description={description}
            bestOfVariants={bestEc2InstanceForEachVariant(allOfVariant, instance, (i) => {
                const [, itype] = i.instance_type.split(".", 3);
                return itype;
            })}
            allOfInstanceType={allOfInstanceType}
            osOptions={osOptions}
            defaultOs={
                instance.instance_type.includes("mem") ? "Oracle" :
                    instance.instance_type.includes("z1d") ? "SQL Server" :
                        "PostgreSQL"
            }
            generatorKey="rds"
            pathPrefix="/aws/rds"
            lessPricingFlexibility={true}
            tablePath="/rds"
        />
    );
}
