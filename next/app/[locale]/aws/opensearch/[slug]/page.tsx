import { loadDataJsonXz } from "@/utils/loadDataAsset";
import { Region } from "@/types";
import type { Instance } from "@/utils/colunnData/opensearch";
import HalfEC2Root from "@/components/HalfEC2Root";
import InstanceDataView from "@/components/InstanceDataView";
import generateOpensearchTables from "@/utils/generateOpensearchTables";
import { Metadata } from "next";
import { urlInject } from "@/utils/urlInject";
import loadAdvertData from "@/utils/loadAdvertData";
import loadCurrencies from "@/utils/loadCurrencies";
import { PRERENDER_LOCALES } from "@/utils/fonts";
import { notFound } from "next/navigation";

export const dynamic = "force-static";
// Prerender only the subset of locales (see PRERENDER_LOCALES); the rest render
// on demand at runtime and are then cached/revalidated (ISR).
export const dynamicParams = true;
export const revalidate = 28800; // 8h, matching the scrape cadence

let p: Promise<{ regions: Region; instances: Instance[] }>;

async function getData() {
    if (p) return p;
    p = (async () => {
        const instances = await loadDataJsonXz<any[]>(
            "data/opensearch/instances.json.xz",
        );
        const regions: Region = {
            main: {},
            local_zone: {},
            wavelength: {},
            china: {},
        };
        for (const instance of instances) {
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

        const instancesCn = await loadDataJsonXz<any[]>(
            "data/opensearch/instances-cn.json.xz",
        );
        for (const instance of instancesCn) {
            for (const r in instance.regions) {
                regions.china[r] = instance.regions[r];
            }
            const matchingInstance = instances.find(
                (i: Instance) => i.instance_type === instance.instance_type,
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

        return {
            regions,
            instances: instances as Instance[],
        };
    })();
    return p;
}

export async function generateStaticParams() {
    const { instances } = await getData();
    return PRERENDER_LOCALES.flatMap((locale) =>
        instances.map((instance) => ({
            locale,
            slug: instance.instance_type,
        })),
    );
}

async function handleParams(params: Promise<{ slug: string }>) {
    const { slug } = await params;
    const { instances, regions } = await getData();
    const instance = instances.find((i) => i.instance_type === slug);
    if (!instance) {
        notFound();
    }
    const regionRoot =
        instance.pricing["us-east-1"] ||
        instance.pricing[Object.keys(instance.pricing)[0]];
    const ondemandCost = regionRoot?.ondemand;
    return { instance, instances, ondemandCost, regions };
}

function generateDescription(instance: Instance, ondemandCost: string) {
    return `The ${instance.instance_type} instance is in the ${instance.family} family and it has ${instance.vcpu} vCPUs, ${instance.memory} GiB of memory starting at $${ondemandCost} per hour.`;
}

export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string }>;
}): Promise<Metadata> {
    const { instance, ondemandCost } = await handleParams(params);
    return {
        title: `${instance.instance_type} pricing and specs - Vantage`,
        description: generateDescription(instance, ondemandCost),
        openGraph: {
            images: [
                urlInject`${"/aws/opensearch/" + instance.instance_type + ".png"}`,
            ],
        },
    };
}

export default async function Page({
    params,
}: {
    params: Promise<{ slug: string; locale: string }>;
}) {
    const { instance, instances, ondemandCost, regions } =
        await handleParams(params);
    const description = generateDescription(instance, ondemandCost);

    const marketingData = await loadAdvertData;
    const currencies = await loadCurrencies;

    const [itype] = instance.instance_type.split(".", 2);
    const allOfInstanceType = instances
        .filter((i) => i.instance_type.startsWith(`${itype}.`))
        .map((i) => ({
            name: i.instance_type,
            cpus: Number(i.vcpu),
            memory: i.memory || "N/A",
        }));

    return (
        <HalfEC2Root
            currencies={currencies}
            allOfInstanceType={allOfInstanceType}
            instance={instance}
            description={description}
            pathPrefix="/aws/opensearch"
            tablePath="/opensearch"
            regions={regions}
            typeName="OpenSearch"
            instanceType="opensearch"
            marketingData={marketingData}
        >
            <InstanceDataView tables={generateOpensearchTables(instance)} />
        </HalfEC2Root>
    );
}
