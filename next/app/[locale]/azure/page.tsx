import {
    loadDataAsset,
    loadDataJson,
    loadDataText,
} from "@/utils/loadDataAsset";
import Head from "next/head";
import { PIPELINE_SIZE } from "@/utils/handleCompressedFile";
import { decode } from "@msgpack/msgpack";
import { AzureInstance } from "@/utils/colunnData/azure";
import AzureClient from "./AzureClient";
import type { Metadata } from "next";
import { Region } from "@/types";
import loadAdvertData from "@/utils/loadAdvertData";
import loadCurrencies from "@/utils/loadCurrencies";
import { buildI18nMetadata } from "@/utils/i18nMetadata";

export async function generateMetadata({
    params,
}: {
    params: Promise<{ locale: string }>;
}): Promise<Metadata> {
    const { locale } = await params;
    const { alternates, ogLocale } = buildI18nMetadata("/azure", locale);
    return {
        title: "Azure VM Comparison",
        description:
            "A free and easy-to-use tool for comparing Azure VM features and prices.",
        alternates,
        openGraph: ogLocale !== undefined ? { locale: ogLocale } : {},
    };
}

export default async function Azure() {
    const regions = await loadDataJson<Region>("azure-regions.json");

    const data = await loadDataAsset("first-100-azure-instances.msgpack");
    const compressedInstances = decode(data) as [string[], ...AzureInstance[]];

    const instanceCount = Number(await loadDataText("azure-instance-count.txt"));
    const instancesHash = await loadDataText("azure-instances-hash.txt");

    const marketingData = await loadAdvertData;
    const currencies = await loadCurrencies;

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
                currencies={currencies}
                instanceCount={instanceCount}
                regions={regions.main}
                compressedDataPathTemplate={`/remaining-azure-instances-p{}.msgpack.xz?cache=${instancesHash}`}
                compressedInstances={compressedInstances}
                marketingData={marketingData}
            />
        </>
    );
}
