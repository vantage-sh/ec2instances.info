import { writeFile, mkdir } from "fs/promises";
import generateIndex from "./generateIndex";
import generateAwsFamilyIndexes from "./generateAwsFamilyIndexes";
import { generateAwsIndexes } from "./generateAwsIndexes";
import generateAwsInstances from "./generateAwsInstances";

async function main() {
    const index = await generateIndex();
    await writeFile("./public/llms.txt", index);
    console.log("Generated llms.txt");

    await mkdir("./public/aws/ec2/families", { recursive: true });
    const familyIndexes = await generateAwsFamilyIndexes();
    for (const [family, index] of familyIndexes.entries()) {
        await writeFile(`./public/aws/ec2/families/${family}.md`, index);
    }
    console.log("Generated aws/ec2/families/*.md");

    const awsIndexes = await generateAwsIndexes();
    for (const [slug, index] of awsIndexes.entries()) {
        await writeFile(`./public/aws/ec2/${slug}.md`, index);
    }
    console.log("Generated indexes for aws/ec2/*.md");

    const awsInstances = await generateAwsInstances();
    for (const [slug, index] of awsInstances.entries()) {
        await writeFile(`./public/aws/ec2/${slug}.md`, index);
    }
    console.log("Generated instances for aws/ec2/*.md");
}

main();
