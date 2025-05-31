import { workers } from "./shared";
import {
    generateAzureImages,
    generateElasticacheImages,
    generateEc2Images,
    generateOpensearchImages,
    generateRdsImages,
    generateRedshiftImages,
} from "./generators";

const allPromises: Promise<void>[] = [
    // EC2
    ...generateEc2Images(),

    // RDS
    ...generateRdsImages(),

    // Elasticache
    ...generateElasticacheImages(),

    // Opensearch
    ...generateOpensearchImages(),

    // Redshift
    ...generateRedshiftImages(),

    // Azure
    ...generateAzureImages(),
];

async function main() {
    await Promise.all(allPromises);
    await Promise.all(workers).then((ws) => {
        for (const w of ws) {
            w.kill();
        }
    });
    console.log("Done!");
    process.exit(0);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
