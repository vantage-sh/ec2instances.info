import { raw, urlInject } from "@/utils/urlInject";
import { getAwsFamilies } from "./loadedData";
import { awsIndexes } from "./generateAwsIndexes";

export default async () => `# ec2instances.info

> ec2instances.info contains a comprehensive list of pricing and specifications for instance types on various cloud providers.

This file contains information on where to find indexes for instance types we support sorted in different ways.

## Amazon EC2

${awsIndexes.map((i) => urlInject`- [Index of all ${raw(i.name)}](${`/aws/ec2/${i.slug}.md`})`).join("\n")}
${(await getAwsFamilies()).map((family) => urlInject`- [Index of all ${raw(family)} instances](${`/aws/ec2/families/${family}.md`})`).join("\n")}
`;
