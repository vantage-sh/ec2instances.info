import { raw, urlInject } from "@/utils/urlInject";
import { getEc2Families, getRdsFamilies, getElasticacheFamilies } from "./loadedData";
import { awsIndexes } from "./generateAwsIndexes";

export default async () => `# ec2instances.info

> ec2instances.info contains a comprehensive list of pricing and specifications for instance types on various cloud providers.

This file contains information on where to find indexes for instance types we support sorted in different ways.

## Amazon EC2

${awsIndexes.map((i) => urlInject`- [Index of all ${raw(i.name)}](${`/aws/ec2/${i.slug}.md`})`).join("\n")}
${(await getEc2Families()).map((family) => urlInject`- [Index of all ${raw(family)} instances](${`/aws/ec2/families/${family}.md`})`).join("\n")}

## Amazon RDS

${awsIndexes.map((i) => urlInject`- [Index of all ${raw(i.name)}](${`/aws/rds/${i.slug}.md`})`).join("\n")}
${(await getRdsFamilies()).map((family) => urlInject`- [Index of all ${raw(family)} instances](${`/aws/rds/families/${family}.md`})`).join("\n")}

## Amazon ElastiCache

${awsIndexes.map((i) => urlInject`- [Index of all ${raw(i.name)}](${`/aws/elasticache/${i.slug}.md`})`).join("\n")}
${(await getElasticacheFamilies()).map((family) => urlInject`- [Index of all ${raw(family)} instances](${`/aws/elasticache/families/${family}.md`})`).join("\n")}
`;
