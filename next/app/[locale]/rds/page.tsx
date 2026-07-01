import { loadDataAsset, loadDataText } from "@/utils/loadDataAsset";
import { decode } from "@msgpack/msgpack";
import { EC2Instance, Region } from "@/types";
import AWSClient from "../AWSClient";
import Head from "next/head";
import type { Metadata } from "next";
import loadAdvertData from "@/utils/loadAdvertData";
import loadCurrencies from "@/utils/loadCurrencies";

export const metadata: Metadata = {
    title: "Amazon RDS Instance Comparison",
    description:
        "A free and easy-to-use tool for comparing RDS Instance features and prices.",
};

export default async function RDS() {
    let data = await loadDataAsset("instance-rds-regions.msgpack");
    const regions = decode(data) as Region;

    data = await loadDataAsset("first-30-rds-instances.msgpack");
    const compressedInstances = decode(data) as [string[], ...EC2Instance[]];

    const instanceCount = Number(await loadDataText("instance-rds-count.txt"));
    const instancesHash = await loadDataText("instance-rds-hash.txt");

    const marketingData = await loadAdvertData;
    const currencies = await loadCurrencies;

    return (
        <>
            <Head>
                <link
                    rel="preload"
                    href={`/remaining-rds-instances.msgpack.xz?cache=${instancesHash}`}
                    as="fetch"
                    fetchPriority="high"
                />
            </Head>
            <AWSClient
                currencies={currencies}
                instanceCount={instanceCount}
                regions={regions}
                compressedInstances={compressedInstances}
                compressedDataPathTemplate={`/remaining-rds-instances.msgpack.xz?cache=${instancesHash}`}
                columnAtomKey="rds"
                marketingData={marketingData}
                savingsPlanSupported={["yrTerm1Savings.noUpfront"]}
            />
        </>
    );
}
