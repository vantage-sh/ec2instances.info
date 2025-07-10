import { readFile } from "fs/promises";
import Head from "next/head";
import { PIPELINE_SIZE } from "@/utils/handleCompressedFile";
import { load } from "js-yaml";
import { decode } from "@msgpack/msgpack";
import { AzureInstance } from "@/utils/colunnData/azure";
import AzureClient from "./AzureClient";
import type { Metadata } from "next";
import loadAdvertData from "@/utils/loadAdvertData";

export const metadata: Metadata = {
    title: "Azure VM Comparison",
    description:
        "A free and easy-to-use tool for comparing Azure VM features and prices.",
};

export default async function Azure() {
    const regions = load(
        await readFile("../meta/regions_azure2.yaml", "utf-8"),
    ) as {
        [key: string]: string;
    };

    const data = await readFile("./public/first-100-azure-instances.msgpack");
    const compressedInstances = decode(data) as [string[], ...AzureInstance[]];

    const instanceCount = Number(
        await readFile("./public/azure-instance-count.txt"),
    );
    const instancesHash = await readFile(
        "./public/azure-instances-hash.txt",
        "utf-8",
    );

    const marketingData = await loadAdvertData;

    return (
        <>
            <Head>
                {Array.from({ length: PIPELINE_SIZE }).map((_, i) => (
                    <link
                        key={i}
                        rel="preload"
                        href={`/remaining-azure-instances-p${i}.msgpack.xz?cache=${instancesHash}`}
                        as="fetch"
                        fetchPriority="high"
                    />
                ))}
            </Head>
            <AzureClient
                instanceCount={instanceCount}
                regions={regions}
                compressedDataPathTemplate={`/remaining-azure-instances-p{}.msgpack.xz?cache=${instancesHash}`}
                compressedInstances={compressedInstances}
                marketingData={marketingData}
            />
        </>
    );
}
