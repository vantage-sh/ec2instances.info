import { readFile } from "fs/promises";
import { EC2Instance, Region } from "@/types";
import EC2InstanceRoot from "@/components/EC2InstanceRoot";
import makeRainbowTable from "@/utils/makeRainbowTable";
import bestEc2InstanceForEachVariant from "@/utils/bestEc2InstanceForEachVariant";
import addRenderInfo from "@/utils/addRenderInfo";
import generateEc2Description from "@/utils/generateEc2Description";
import { Metadata } from "next";
import { urlInject } from "@/utils/urlInject";
import loadAdvertData from "@/utils/loadAdvertData";
import loadCurrencies from "@/utils/loadCurrencies";

export const dynamic = "force-static";

let p: Promise<{ regions: Region; instances: EC2Instance[] }>;

async function getData() {
    if (p) return p;
    p = (async () => {
        const instances = JSON.parse(
            await readFile("../www/cache/instances.json", "utf8"),
        );
        const regions: Region = {
            main: {},
            local_zone: {},
            wavelength: {},
            china: {},
        };
        for (const instance of instances) {
            addRenderInfo(instance);
            for (const r in instance.pricing) {
                if (r.includes("wl1") || r.includes("wl2")) {
                    regions.wavelength[r] = instance.regions[r];
                } else if ((r.match(/\d+/g) || []).length > 1) {
                    regions.local_zone[r] = instance.regions[r];
                } else {
                    regions.main[r] = instance.regions[r];
                }
            }
        }

        const instancesCn = JSON.parse(
            await readFile("../www/cache/instances-cn.json", "utf8"),
        );
        for (const instance of instancesCn) {
            for (const r in instance.regions) {
                regions.china[r] = instance.regions[r];
            }
            const matchingInstance = instances.find(
                (i: EC2Instance) => i.instance_type === instance.instance_type,
            );
            if (!matchingInstance) {
                throw new Error(
                    `Instance ${instance.instance_type} not found in instances.json`,
                );
            }
            matchingInstance.pricing = {
                ...matchingInstance.pricing,
                ...instance.pricing,
            };
        }

        for (const x of instances) {
            if ("vcpu" in x) {
                x.vCPU = x.vcpu;
                delete x.vcpu;
            }
        }
        return {
            regions,
            instances: instances as EC2Instance[],
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
    const regionRoot =
        instance.pricing["us-east-1"] ||
        instance.pricing[Object.keys(instance.pricing)[0]];
    const ondemandCost = regionRoot?.Redis?.ondemand;
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
        description: generateEc2Description(instance, ondemandCost),
        openGraph: {
            images: [
                urlInject`${"/aws/elasticache/" + instance.instance_type + ".png"}`,
            ],
        },
    };
}

const osOptions: [string, string][] = [
    ["Redis", "Redis"],
    ["Memcached", "Memcached"],
    ["Valkey", "Valkey"],
];

const reservedTermOptions: [string, string][] = [
    ["Standard.noUpfront", "No Upfront"],
    ["Standard.partialUpfront", "Partial Upfront"],
    ["Standard.allUpfront", "All Upfront"],
];

export default async function Page({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { instance, instances, ondemandCost, regions } =
        await handleParams(params);
    const description = generateEc2Description(instance, ondemandCost);

    const [cache, itype] = instance.instance_type.split(".", 3);
    const variant = itype.slice(0, 2);
    const allOfVariant = instances.filter((i) =>
        i.instance_type.startsWith(`${cache}.${variant}`),
    );
    const allOfInstanceType = instances
        .filter((i) => i.instance_type.startsWith(`${cache}.${itype}.`))
        .map((i) => ({
            name: i.instance_type,
            cpus: i.vCPU,
            memory: i.memory || "N/A",
        }));

    const compressedInstance = makeRainbowTable([{ ...instance }]);

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
                    const [, itype] = i.instance_type.split(".", 3);
                    return itype;
                },
            )}
            allOfInstanceType={allOfInstanceType}
            osOptions={osOptions}
            defaultOs="Redis"
            generatorKey="elasticache"
            pathPrefix="/aws/elasticache"
            removeSpot={true}
            tablePath="/cache"
            storeOsNameRatherThanId={true}
            reservedTermOptions={reservedTermOptions}
            typeName="Cache"
            marketingInstanceType="elasticache"
            marketingData={marketingData}
        />
    );
}
