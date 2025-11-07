import { writeFile, mkdir } from "fs/promises";
import generateIndex from "./generateIndex";
import generateAwsFamilyIndexes from "./generateAwsFamilyIndexes";
import { calculatePrice, generateAwsIndexes } from "./generateAwsIndexes";
import generateAwsInstances from "./generateAwsInstances";
import {
    awsInstances,
    elasticacheInstances,
    rdsInstances,
    redshiftInstances,
    opensearchInstances,
} from "./loadedData";
import { ec2, elasticache, rds } from "@/utils/ec2TablesGenerator";
import generateEc2Description from "@/utils/generateEc2Description";
import generateRedshiftMarkdown from "./generateRedshiftMarkdown";
import generateOpensearchMarkdown from "./generateOpensearchMarkdown";
import { generateOpensearchIndexes } from "./generateOpensearchIndexes";
import generateOpensearchFamilyIndexes from "./generateOpensearchFamilyIndexes";
import generateAzureFamilyIndexes from "./generateAzureFamilyIndexes";
import { generateAzureIndexes } from "./generateAzureIndexes";
import generateAzureInstances from "./generateAzureInstances";
import generateGcpFamilyIndexes from "./generateGcpFamilyIndexes";
import { generateGcpIndexes } from "./generateGcpIndexes";
import generateGcpInstances from "./generateGcpInstances";
function generateRdsDescription(
    instance: any,
    ondemandCost: string | undefined,
) {
    return `The ${instance.instance_type} instance is a ${instance.family} instance with ${instance.vCPU} vCPUs and ${instance.memory}GB of memory starting at $${ondemandCost} per hour.`;
}

async function main() {
    const index = await generateIndex();
    await writeFile("./public/llms.txt", index);
    console.log("Generated llms.txt");

    await mkdir("./public/aws/ec2/families", { recursive: true });
    let familyIndexes = await generateAwsFamilyIndexes(
        "/aws/ec2",
        (s) => s.split(".")[0],
        awsInstances,
    );
    for (const [family, index] of familyIndexes.entries()) {
        await writeFile(`./public/aws/ec2/families/${family}.md`, index);
    }
    console.log("Generated aws/ec2/families/*.md");

    let awsIndexes = await generateAwsIndexes("/aws/ec2", awsInstances, true);
    for (const [slug, index] of awsIndexes.entries()) {
        await writeFile(`./public/aws/ec2/${slug}.md`, index);
    }
    console.log("Generated indexes for aws/ec2/*.md");

    const awsInstancesMap = await generateAwsInstances(
        (instance) => {
            return generateEc2Description(instance, calculatePrice(instance));
        },
        false,
        "/aws/ec2",
        false,
        awsInstances,
        ec2,
    );
    const promises: Promise<void>[] = [];
    for (const [slug, index] of awsInstancesMap.entries()) {
        promises.push(writeFile(`./public/aws/ec2/${slug}.md`, index.root));
        for (const [region, i] of index.regions.entries()) {
            promises.push(
                writeFile(`./public/aws/ec2/${slug}-${region}.md`, i),
            );
        }
    }
    await Promise.all(promises);
    console.log("Generated instances for aws/ec2/*.md");

    await mkdir("./public/aws/rds/families", { recursive: true });
    familyIndexes = await generateAwsFamilyIndexes(
        "/aws/rds",
        (s) => {
            const [family, version] = s.split(".", 3);
            return `${family}.${version}`;
        },
        rdsInstances,
    );
    for (const [family, index] of familyIndexes.entries()) {
        await writeFile(`./public/aws/rds/families/${family}.md`, index);
    }
    console.log("Generated aws/rds/families/*.md");

    awsIndexes = await generateAwsIndexes("/aws/rds", rdsInstances, false);
    for (const [slug, index] of awsIndexes.entries()) {
        await writeFile(`./public/aws/rds/${slug}.md`, index);
    }
    console.log("Generated indexes for aws/rds/*.md");

    promises.length = 0;
    const rdsInstancesMap = await generateAwsInstances(
        (instance) => {
            return generateRdsDescription(instance, calculatePrice(instance));
        },
        true,
        "/aws/rds",
        true,
        rdsInstances,
        rds,
    );
    for (const [slug, index] of rdsInstancesMap.entries()) {
        promises.push(writeFile(`./public/aws/rds/${slug}.md`, index.root));
        for (const [region, i] of index.regions.entries()) {
            promises.push(
                writeFile(`./public/aws/rds/${slug}-${region}.md`, i),
            );
        }
    }
    await Promise.all(promises);
    console.log("Generated instances for aws/rds/*.md");

    await mkdir("./public/aws/elasticache/families", { recursive: true });
    familyIndexes = await generateAwsFamilyIndexes(
        "/aws/elasticache",
        (s) => {
            const [family, version] = s.split(".", 3);
            return `${family}.${version}`;
        },
        elasticacheInstances,
    );
    for (const [family, index] of familyIndexes.entries()) {
        await writeFile(
            `./public/aws/elasticache/families/${family}.md`,
            index,
        );
    }
    console.log("Generated aws/elasticache/families/*.md");

    awsIndexes = await generateAwsIndexes(
        "/aws/elasticache",
        elasticacheInstances,
        false,
    );
    for (const [slug, index] of awsIndexes.entries()) {
        await writeFile(`./public/aws/elasticache/${slug}.md`, index);
    }
    console.log("Generated indexes for aws/elasticache/*.md");

    promises.length = 0;
    const elasticacheInstancesMap = await generateAwsInstances(
        (instance) => {
            return generateRdsDescription(instance, calculatePrice(instance));
        },
        true,
        "/aws/elasticache",
        true,
        elasticacheInstances,
        elasticache,
    );
    for (const [slug, index] of elasticacheInstancesMap.entries()) {
        promises.push(
            writeFile(`./public/aws/elasticache/${slug}.md`, index.root),
        );
        for (const [region, i] of index.regions.entries()) {
            promises.push(
                writeFile(`./public/aws/elasticache/${slug}-${region}.md`, i),
            );
        }
    }
    await Promise.all(promises);
    console.log("Generated instances for aws/elasticache/*.md");

    await mkdir("./public/aws/redshift", { recursive: true });
    promises.length = 0;
    for (const instance of await redshiftInstances) {
        const markdown = generateRedshiftMarkdown(instance);
        promises.push(
            writeFile(
                `./public/aws/redshift/${instance.instance_type}.md`,
                markdown,
            ),
        );
    }
    await Promise.all(promises);
    console.log("Generated instances for aws/redshift/*.md");

    await mkdir("./public/aws/opensearch/families", { recursive: true });
    const opensearchFamilyIndexes =
        await generateOpensearchFamilyIndexes(opensearchInstances);
    for (const [family, index] of opensearchFamilyIndexes.entries()) {
        await writeFile(`./public/aws/opensearch/families/${family}.md`, index);
    }
    console.log("Generated aws/opensearch/families/*.md");

    const opensearchIndexes =
        await generateOpensearchIndexes(opensearchInstances);
    for (const [slug, index] of opensearchIndexes.entries()) {
        await writeFile(`./public/aws/opensearch/${slug}.md`, index);
    }
    console.log("Generated indexes for aws/opensearch/*.md");

    promises.length = 0;
    for (const instance of await opensearchInstances) {
        const markdown = generateOpensearchMarkdown(instance);
        promises.push(
            writeFile(
                `./public/aws/opensearch/${instance.instance_type}.md`,
                markdown,
            ),
        );
    }
    await Promise.all(promises);
    console.log("Generated instances for aws/opensearch/*.md");

    await mkdir("./public/azure/vm/families", { recursive: true });
    familyIndexes = await generateAzureFamilyIndexes("/azure/vm");
    for (const [family, index] of familyIndexes.entries()) {
        await writeFile(`./public/azure/vm/families/${family}.md`, index);
    }
    console.log("Generated azure/vm/families/*.md");

    const azureIndexes = await generateAzureIndexes("/azure/vm");
    for (const [slug, index] of azureIndexes.entries()) {
        await writeFile(`./public/azure/vm/${slug}.md`, index);
    }
    console.log("Generated indexes for azure/vm/*.md");

    const azureInstances = await generateAzureInstances();
    promises.length = 0;
    for (const [slug, index] of azureInstances.entries()) {
        promises.push(writeFile(`./public/azure/vm/${slug}.md`, index.root));
        for (const [region, i] of index.regions.entries()) {
            promises.push(
                writeFile(`./public/azure/vm/${slug}-${region}.md`, i),
            );
        }
    }
    await Promise.all(promises);
    console.log("Generated instances for azure/vm/*.md");

    await mkdir("./public/gcp/families", { recursive: true });
    familyIndexes = await generateGcpFamilyIndexes("/gcp");
    for (const [family, index] of familyIndexes.entries()) {
        await writeFile(`./public/gcp/families/${family}.md`, index);
    }
    console.log("Generated gcp/families/*.md");

    const gcpIndexes = await generateGcpIndexes("/gcp");
    for (const [slug, index] of gcpIndexes.entries()) {
        await writeFile(`./public/gcp/${slug}.md`, index);
    }
    console.log("Generated indexes for gcp/*.md");

    const gcpInstances = await generateGcpInstances();
    promises.length = 0;
    for (const [slug, index] of gcpInstances.entries()) {
        promises.push(writeFile(`./public/gcp/${slug}.md`, index.root));
        for (const [region, i] of index.regions.entries()) {
            promises.push(writeFile(`./public/gcp/${slug}-${region}.md`, i));
        }
    }
    await Promise.all(promises);
    console.log("Generated instances for gcp/*.md");
}

main();
