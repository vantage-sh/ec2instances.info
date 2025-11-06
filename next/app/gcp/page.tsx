import { readFile } from "fs/promises";
import Head from "next/head";
import { PIPELINE_SIZE } from "@/utils/handleCompressedFile";
import { decode } from "@msgpack/msgpack";
import { GCPInstance } from "@/utils/colunnData/gcp";
import GCPClient from "./GCPClient";
import type { Metadata } from "next";
import { Region } from "@/types";
import loadAdvertData from "@/utils/loadAdvertData";
import loadCurrencies from "@/utils/loadCurrencies";

export const metadata: Metadata = {
    title: "GCP Compute Engine Comparison",
    description:
        "A free and easy-to-use tool for comparing GCP Compute Engine features and prices.",
};

export default async function GCP() {
    const regions = JSON.parse(
        await readFile("./public/gcp-regions.json", "utf-8"),
    ) as Region;

    const data = await readFile("./public/first-100-gcp-instances.msgpack");
    const compressedInstances = decode(data) as [string[], ...GCPInstance[]];

    const instanceCount = Number(
        await readFile("./public/gcp-instance-count.txt"),
    );
    const instancesHash = await readFile(
        "./public/gcp-instances-hash.txt",
        "utf-8",
    );

    const marketingData = await loadAdvertData;
    const currencies = await loadCurrencies;

    return (
        <>
            <Head>
                {Array.from({ length: PIPELINE_SIZE }).map((_, i) => (
                    <link
                        key={i}
                        rel="preload"
                        href={`/remaining-gcp-instances-p${i}.msgpack.xz?cache=${instancesHash}`}
                        as="fetch"
                        fetchPriority="high"
                    />
                ))}
            </Head>
            <GCPClient
                currencies={currencies}
                instanceCount={instanceCount}
                regions={regions.main}
                compressedDataPathTemplate={`/remaining-gcp-instances-p{}.msgpack.xz?cache=${instancesHash}`}
                compressedInstances={compressedInstances}
                marketingData={marketingData}
            />
        </>
    );
}
