import { writeFile, mkdir } from "fs/promises";
import generateIndex from "./generateIndex";
import generateAwsFamilyIndexes from "./generateAwsFamilyIndexes";

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
}

main();
