import { AzureInstance } from "@/utils/colunnData/azure";
import { load } from "js-yaml";
import { readFile } from "fs/promises";
import formatAzureInstanceType from "@/utils/formatAzureInstanceType";
import makeRainbowTable from "@/utils/makeRainbowTable";
import AzureInstanceRoot from "@/components/AzureInstanceRoot";
import generateAzureDescription from "@/utils/generateAzureDescription";
import { Metadata } from "next";
import { urlInject } from "@/utils/urlInject";
import loadAdvertData from "@/utils/loadAdvertData";

export const dynamic = "force-static";

let p: Promise<{ regions: Record<string, string>; instances: AzureInstance[] }>;

async function getData() {
    if (p) return p;
    p = (async () => {
        const regions = load(
            await readFile("../meta/regions_azure2.yaml", "utf8"),
        ) as Record<string, string>;
        const instances = JSON.parse(
            await readFile("../www/azure/instances.json", "utf8"),
        ) as AzureInstance[];
        for (const instance of instances) {
            formatAzureInstanceType(instance);
        }
        return {
            regions,
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
    )!;

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
    params: Promise<{ slug: string }>;
}): Promise<Metadata> {
    const { description, instance } = await handleParams(params);
    return {
        title: `${instance.pretty_name} pricing and specs - Vantage`,
        description,
        openGraph: {
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

    return (
        <AzureInstanceRoot
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
