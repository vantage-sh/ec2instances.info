import { raw, urlInject } from "@/utils/urlInject";
import { getAwsFamilies } from "./loadedData";

export default async () => `# ec2instances.info

> ec2instances.info contains a comprehensive list of pricing and specifications for instance types on various cloud providers.

This file contains information on where to find indexes for instance types we support sorted in different ways.

## Amazon EC2

${(await getAwsFamilies()).map((family) => urlInject`- [Index of all ${raw(family)} instances](${`/aws/ec2/families/${family}.md`})`).join("\n")}
`;
