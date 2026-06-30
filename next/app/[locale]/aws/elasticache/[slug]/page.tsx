import { loadDataJsonXz } from "@/utils/loadDataAsset";
import { EC2Instance, Region } from "@/types";
import EC2InstanceRoot from "@/components/EC2InstanceRoot";
import makeRainbowTable from "@/utils/makeRainbowTable";
import bestEc2InstanceForEachVariant from "@/utils/bestEc2InstanceForEachVariant";
import addRenderInfo from "@/utils/addRenderInfo";
import buildInstanceDescription from "@/utils/buildInstanceDescription";
import makeDictionaryTranslator from "@/utils/makeDictionaryTranslator";
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

let p: Promise<{ regions: Region; instances: EC2Instance[] }>;

async function getData() {
    if (p) return p;
    p = (async () => {
        const instances = await loadDataJsonXz<any[]>(
            "data/cache/instances.json.xz",
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

        const instancesCn = await loadDataJsonXz<any[]>(
            "data/cache/instances-cn.json.xz",
        );
        for (const instance of instancesCn) {
            for (const r in instance.regions) {
                regions.china[r] = instance.regions[r];
            }
            const matchingInstance = instances.find(
                (i: EC2Instance) => i.instance_type === instance.instance_type,
            );
            if (!matchingInstance) {
                console.warn(
                    `Skipping stale China ElastiCache instance ${instance.instance_type} missing from instances.json`,
                );
                continue;
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
    const ondemandCost = regionRoot?.Redis?.ondemand;
    return { instance, instances, ondemandCost, regions };
}

export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string; locale: string }>;
}): Promise<Metadata> {
    const { instance, ondemandCost } = await handleParams(params);
    const { locale } = await params;
    let common: Record<string, unknown>;
    try {
        common = (await import(`@/translations/${locale}/common.json`)).default;
    } catch {
        common = (await import("@/translations/en-GB/common.json")).default;
    }
    const t = makeDictionaryTranslator(common);
    return {
        title: `${instance.instance_type} pricing and specs - Vantage`,
        description: buildInstanceDescription(t, instance, ondemandCost as string),
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
    ["Savings.noUpfront", "No Upfront (Savings Plan)"],
    ["Standard.noUpfront", "No Upfront"],
    ["Standard.partialUpfront", "Partial Upfront"],
    ["Standard.allUpfront", "All Upfront"],
];

export default async function Page({
    params,
}: {
    params: Promise<{ slug: string; locale: string }>;
}) {
    const { instance, instances, ondemandCost, regions } =
        await handleParams(params);

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
            ondemandCost={ondemandCost}
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
