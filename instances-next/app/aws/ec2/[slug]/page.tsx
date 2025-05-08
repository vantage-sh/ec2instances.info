import { decode } from "@msgpack/msgpack";
import { readFile } from "fs/promises";
import { XzReadableStream } from "xz-decompress";
import { EC2Instance, Region } from "@/types";
import processRainbowTable from "@/utils/processRainbowTable";
import EC2InstanceRoot from "@/components/EC2InstanceRoot";
import { PIPELINE_SIZE } from "@/utils/handleCompressedFile";
import makeRainbowTable from "@/utils/makeRainbowTable";
import generateDescription from "@/utils/generateDescription";
import bestEc2InstanceForEachVariant from "@/utils/bestEc2InstanceForEachVariant";

export const dynamic = "force-static";

let p: Promise<{ regions: Region; instances: EC2Instance[] }>;

async function getData() {
    if (p) return p;
    p = (async () => {
        const regions = decode(
            await readFile("./public/instances-regions.msgpack"),
        ) as Region;
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

async function handleParams(params: Promise<{ slug: string }>) {
    const { slug } = await params;
    const { instances, regions } = await getData();
    const instance = instances.find((i) => i.instance_type === slug)!;
    const ondemandCost = instance.pricing["us-east-1"]?.linux?.ondemand || "N/A";
    return { instance, instances, ondemandCost, regions };
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
    ["linux", "Linux"],
    ["mswin", "Windows"],
    ["rhel", "Red Hat"],
    ["sles", "SUSE"],
    ["dedicated", "Dedicated Host"],
    ["linuxSQL", "Linux SQL Server"],
    ["linuxSQLWeb", "Linux SQL Server for Web"],
    ["linuxSQLEnterprise", "Linux SQL Enterprise"],
    ["mswinSQL", "Windows SQL Server"],
    ["mswinSQLWeb", "Windows SQL Web"],
    ["mswinSQLEnterprise", "Windows SQL Enterprise"],
    ["rhelSQL", "Red Hat SQL Server"],
    ["rhelSQLWeb", "Red Hat SQL Web"],
    ["rhelSQLEnterprise", "Red Hat SQL Enterprise"],
];

export default async function Page({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { instance, instances, ondemandCost, regions } = await handleParams(params);
    const description = generateDescription(instance, ondemandCost);

    const [itype] = instance.instance_type.split(".", 2);
    const variant = itype.slice(0, 2);
    const allOfVariant = instances.filter((i) => i.instance_type.startsWith(variant));
    const allOfInstanceType = instances.filter((i) => i.instance_type.startsWith(`${itype}.`)).map((i) => ({
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
                const [itype] = i.instance_type.split(".", 2);
                return itype;
            })}
            allOfInstanceType={allOfInstanceType}
            osOptions={osOptions}
            defaultOs="linux"
            generatorKey="ec2"
            pathPrefix="/aws/ec2"
            lessPricingFlexibility={false}
        />
    );
}
