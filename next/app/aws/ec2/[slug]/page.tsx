import { decode } from "@msgpack/msgpack";
import { readFile } from "fs/promises";
import { XzReadableStream } from "xz-decompress";
import { EC2Instance, Region } from "@/types";
import processRainbowTable from "@/utils/processRainbowTable";
import EC2InstanceRoot from "@/components/EC2InstanceRoot";
import { PIPELINE_SIZE } from "@/utils/handleCompressedFile";
import makeRainbowTable from "@/utils/makeRainbowTable";
import generateEc2Description from "@/utils/generateEc2Description";
import bestEc2InstanceForEachVariant from "@/utils/bestEc2InstanceForEachVariant";
import tryPricingMappingWithDefaultsAndYoloIfNot from "@/utils/tryPricingGetAndYoloIfNot";
import { Metadata } from "next/dist/lib/metadata/types/metadata-interface";
import { urlInject } from "@/utils/urlInject";
import loadAdvertData from "@/utils/loadAdvertData";
import loadCurrencies from "@/utils/loadCurrencies";

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
            remainingInstances.push(
                ...remaining.map((i) => processRainbowTable(rainbowTable, i)),
            );
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
    const ondemandCost =
        tryPricingMappingWithDefaultsAndYoloIfNot(
            instance.pricing,
            "us-east-1",
        ) || "N/A";
    return { instance, instances, ondemandCost, regions };
}

export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string }>;
}): Promise<Metadata> {
    const { instance, ondemandCost } = await handleParams(params);
    return {
        title: `${instance.instance_type} pricing and specs - Vantage`,
        description: generateEc2Description(instance, ondemandCost as string),
        openGraph: {
            images: [
                urlInject`${"/aws/ec2/" + instance.instance_type + ".png"}`,
            ],
        },
    };
}

const reservedTermOptions: [string, string][] = [
    ["Savings.noUpfront", "No Upfront (Savings Plan)"],
    ["Savings.partialUpfront", "Partial Upfront (Savings Plan)"],
    ["Savings.allUpfront", "All Upfront (Savings Plan)"],
    ["Standard.noUpfront", "No Upfront"],
    ["Standard.partialUpfront", "Partial Upfront"],
    ["Standard.allUpfront", "All Upfront"],
    ["Convertible.noUpfront", "No Upfront (Convertible)"],
    ["Convertible.partialUpfront", "Partial Upfront (Convertible)"],
    ["Convertible.allUpfront", "All Upfront (Convertible)"],
];

const osOptions: [string, string][] = [
    ["linux", "Linux"],
    ["mswin", "Windows"],
    ["rhel", "Red Hat"],
    ["rhelHA", "Red Hat with HA"],
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
    const { instance, instances, ondemandCost, regions } =
        await handleParams(params);
    const description = generateEc2Description(
        instance,
        ondemandCost as string,
    );
    const [itype] = instance.instance_type.split(".", 2);
    const variant = itype.slice(0, 2);
    const allOfVariant = instances.filter((i) =>
        i.instance_type.startsWith(variant),
    );
    const allOfInstanceType = instances
        .filter((i) => i.instance_type.startsWith(`${itype}.`))
        .map((i) => ({
            name: i.instance_type,
            cpus: i.vCPU,
            memory: i.memory || "N/A",
        }));

    const compressedInstance = makeRainbowTable([{ ...instance }]);

    let marketingInstanceType = "ec2-other";
    if (
        instance.instance_type.includes("flex") ||
        instance.instance_type.startsWith("t")
    ) {
        marketingInstanceType = "ec2-flex";
    } else if (instance.GPU && Number(instance.GPU) !== 0) {
        marketingInstanceType = "ec2-gpu";
    }

    const marketingData = await loadAdvertData;
    const currencies = await loadCurrencies;

    return (
        <EC2InstanceRoot
            currencies={currencies}
            rainbowTable={compressedInstance[0] as string[]}
            compressedInstance={compressedInstance[1] as EC2Instance}
            regions={regions}
            description={description}
            bestOfVariants={bestEc2InstanceForEachVariant(
                allOfVariant,
                instance,
                (i) => {
                    const [itype] = i.instance_type.split(".", 2);
                    return itype;
                },
            )}
            allOfInstanceType={allOfInstanceType}
            marketingData={marketingData}
            osOptions={osOptions}
            defaultOs="linux"
            generatorKey="ec2"
            pathPrefix="/aws/ec2"
            removeSpot={false}
            tablePath="/"
            storeOsNameRatherThanId={false}
            reservedTermOptions={reservedTermOptions}
            typeName="EC2"
            marketingInstanceType={marketingInstanceType}
        />
    );
}
