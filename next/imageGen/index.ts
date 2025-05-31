import { workers } from "./shared";
import { generateEc2Images, generateRdsImages } from "./generators";

const allPromises: Promise<void>[] = [
    // EC2
    ...generateEc2Images(),

    // RDS
    ...generateRdsImages(),
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
