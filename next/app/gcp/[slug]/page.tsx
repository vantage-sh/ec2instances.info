import { GCPInstance } from "@/utils/colunnData/gcp";
import { readFile } from "fs/promises";
import { Metadata } from "next";
import { urlInject } from "@/utils/urlInject";
import { Region } from "@/types";
import { notFound } from "next/navigation";
import makeRainbowTable from "@/utils/makeRainbowTable";
import GCPInstanceRoot from "@/components/GCPInstanceRoot";
import generateGcpDescription from "@/utils/generateGcpDescription";
import loadAdvertData from "@/utils/loadAdvertData";
import loadCurrencies from "@/utils/loadCurrencies";

export const dynamic = "force-static";

let p: Promise<{ regions: Record<string, string>; instances: GCPInstance[] }>;

async function getData() {
    if (p) return p;
    p = (async () => {
        const regions = JSON.parse(
            await readFile("./public/gcp-regions.json", "utf-8"),
        ) as Region;
        const instances = JSON.parse(
            await readFile("../www/gcp/instances.json", "utf8"),
        ) as GCPInstance[];
        return {
            regions: regions.main,
            instances,
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
        description: generateGcpDescription(instance),
    };
}

export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string }>;
}): Promise<Metadata> {
    const { description, instance } = await handleParams(params);
    return {
        title: `${instance.pretty_name} pricing and specs - Vantage`,
        description,
        openGraph: {
            images: [urlInject`${"/gcp/" + instance.instance_type + ".png"}`],
        },
    };
}

function findNearestInstanceMutatesNoCleanup(
    instances: GCPInstance[],
    closestTo: GCPInstance,
) {
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
        if (
            left.vCPU === closestTo.vCPU ||
            left.memory === closestTo.memory ||
            (left.GPU || 0) === (closestTo.GPU || 0)
        ) {
            return left;
        }
        if (
            right.vCPU === closestTo.vCPU ||
            right.memory === closestTo.memory ||
            (right.GPU || 0) === (closestTo.GPU || 0)
        ) {
            return right;
        }

        // If this isn't possible, return the best of the two.
        return left.vCPU === right.vCPU && left.memory === right.memory
            ? left
            : right;
    }
    return left || right;
}

function bestGcpInstanceForEachVariant(
    instances: GCPInstance[],
    closestTo: GCPInstance,
) {
    const variants: Map<string, GCPInstance | GCPInstance[]> = new Map();
    for (const instance of instances) {
        const itype = instance.instance_type.split("-", 2)[0];
        let a = variants.get(itype);
        if (!a) {
            a = [];
            variants.set(itype, a);
        }
        (a as GCPInstance[]).push(instance);
    }

    for (const [itype, instances] of variants.entries()) {
        if ((instances as GCPInstance[]).includes(closestTo)) {
            variants.set(itype, closestTo);
        }
        const best = findNearestInstanceMutatesNoCleanup(
            instances as GCPInstance[],
            closestTo,
        );
        variants.set(itype, best);
    }

    const o: { [key: string]: string } = {};
    for (const [itype, instance] of variants.entries()) {
        o[itype] = (instance as GCPInstance).instance_type;
    }
    return o;
}

export default async function Page({
    params,
}: {
    params: Promise<{ slug: string }>;
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
            cpus: i.vCPU,
            memory: i.memory || "N/A",
        }));

    const variant = itype.slice(0, 1);
    const allOfVariant = instances.filter((i) =>
        i.instance_type.startsWith(variant),
    );
    const bestOfVariants = bestGcpInstanceForEachVariant(
        allOfVariant,
        instance,
    );

    const compressedInstance = makeRainbowTable([{ ...instance }]);
    const currencies = await loadCurrencies;

    return (
        <GCPInstanceRoot
            currencies={currencies}
            rainbowTable={compressedInstance[0] as string[]}
            compressedInstance={compressedInstance[1] as GCPInstance}
            allOfInstanceType={allOfInstanceType}
            regions={regions}
            description={description}
            bestOfVariants={bestOfVariants}
            marketingData={marketingData}
        />
    );
}
