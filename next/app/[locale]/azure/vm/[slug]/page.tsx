import { AzureInstance } from "@/utils/colunnData/azure";
import { loadDataJson, loadDataJsonXz } from "@/utils/loadDataAsset";
import formatAzureInstanceType from "@/utils/formatAzureInstanceType";
import makeRainbowTable from "@/utils/makeRainbowTable";
import AzureInstanceRoot from "@/components/AzureInstanceRoot";
import generateAzureDescription from "@/utils/generateAzureDescription";
import { Metadata } from "next";
import { urlInject } from "@/utils/urlInject";
import { buildI18nMetadata } from "@/utils/i18nMetadata";
import { Region } from "@/types";
import loadAdvertData from "@/utils/loadAdvertData";
import loadCurrencies from "@/utils/loadCurrencies";
import { PRERENDER_LOCALES } from "@/utils/fonts";
import { notFound } from "next/navigation";

export const dynamic = "force-static";
// Prerender only the subset of locales (see PRERENDER_LOCALES); the rest render
// on demand at runtime and are then cached/revalidated (ISR).
export const dynamicParams = true;
export const revalidate = 28800; // 8h, matching the scrape cadence

let p:
    | Promise<{ regions: Record<string, string>; instances: AzureInstance[] }>
    | undefined;

async function getData() {
    if (p) return p;
    p = (async () => {
        const regions = await loadDataJson<Region>("azure-regions.json");
        const instances = await loadDataJsonXz<AzureInstance[]>(
            "data/azure/instances.json.xz",
        );
        for (const instance of instances) {
            formatAzureInstanceType(instance);
        }
        return {
            regions: regions.main,
            instances,
        };
    })().catch((e) => {
        p = undefined;
        throw e;
    });
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
    const instance = instances.find(
        (instance) => instance.instance_type === slug,
    );
    if (!instance) {
        notFound();
    }

    return {
        instance,
        instances,
        regions,
        description: generateAzureDescription(instance),
    };
}

export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string; locale: string }>;
}): Promise<Metadata> {
    const { description, instance } = await handleParams(params);
    const { locale } = await params;
    const { alternates, ogLocale } = buildI18nMetadata(
        `/azure/vm/${instance.instance_type}`,
        locale,
    );
    return {
        title: `${instance.pretty_name} pricing and specs - Vantage`,
        description,
        alternates,
        openGraph: {
            ...(ogLocale !== undefined ? { locale: ogLocale } : {}),
            images: [
                urlInject`${"/azure/vm/" + instance.instance_type + ".png"}`,
            ],
        },
    };
}

function findNearestInstanceMutatesNoCleanup(
    instances: AzureInstance[],
    closestTo: AzureInstance,
) {
    instances.push(closestTo);
    instances.sort((a, b) => {
        // Sort by CPU, memory, and then GPU.
        if (a.vcpu !== b.vcpu) {
            return a.vcpu - b.vcpu;
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
        if (
            left.vcpu === closestTo.vcpu ||
            left.memory === closestTo.memory ||
            (left.GPU || 0) === (closestTo.GPU || 0)
        ) {
            return left;
        }
        if (
            right.vcpu === closestTo.vcpu ||
            right.memory === closestTo.memory ||
            (right.GPU || 0) === (closestTo.GPU || 0)
        ) {
            return right;
        }

        // If this isn't possible, return the best of the two.
        return left.vcpu === right.vcpu && left.memory === right.memory
            ? left
            : right;
    }
    return left || right;
}

function bestAzureInstanceForEachVariant(
    instances: AzureInstance[],
    closestTo: AzureInstance,
) {
    const variants: Map<string, AzureInstance | AzureInstance[]> = new Map();
    for (const instance of instances) {
        const itype = instance.instance_type.split("-", 2)[0];
        let a = variants.get(itype);
        if (!a) {
            a = [];
            variants.set(itype, a);
        }
        (a as AzureInstance[]).push(instance);
    }

    for (const [itype, instances] of variants.entries()) {
        if ((instances as AzureInstance[]).includes(closestTo)) {
            variants.set(itype, closestTo);
        }
        const best = findNearestInstanceMutatesNoCleanup(
            instances as AzureInstance[],
            closestTo,
        );
        variants.set(itype, best);
    }

    const o: { [key: string]: string } = {};
    for (const [itype, instance] of variants.entries()) {
        o[itype] = (instance as AzureInstance).instance_type;
    }
    return o;
}

export default async function Page({
    params,
}: {
    params: Promise<{ slug: string; locale: string }>;
}) {
    const marketingData = await loadAdvertData;

    const { instances, instance, regions, description } =
        await handleParams(params);
    const [itype] = instance.instance_type.split("-", 2);
    const allOfInstanceType = instances
        .filter(
            (i) =>
                i.instance_type.startsWith(`${itype}-`) ||
                i.instance_type === itype,
        )
        .map((i) => ({
            name: i.instance_type,
            cpus: i.vcpu,
            memory: i.memory || "N/A",
        }));

    const variant = itype.slice(0, 1);
    const allOfVariant = instances.filter((i) =>
        i.instance_type.startsWith(variant),
    );
    const bestOfVariants = bestAzureInstanceForEachVariant(
        allOfVariant,
        instance,
    );

    const compressedInstance = makeRainbowTable([{ ...instance }]);
    const currencies = await loadCurrencies;

    return (
        <AzureInstanceRoot
            currencies={currencies}
            rainbowTable={compressedInstance[0] as string[]}
            compressedInstance={compressedInstance[1] as AzureInstance}
            allOfInstanceType={allOfInstanceType}
            regions={regions}
            description={description}
            bestOfVariants={bestOfVariants}
            marketingData={marketingData}
        />
    );
}
