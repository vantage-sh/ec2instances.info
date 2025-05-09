import { raw, urlInject } from "@/utils/urlInject";
import { getEc2Families, getRdsFamilies, getElasticacheFamilies, getOpensearchFamilies, redshiftInstances, opensearchInstances } from "./loadedData";
import { awsIndexes } from "./generateAwsIndexes";
import { opensearchIndexes } from "./generateOpensearchIndexes";
export default async () => `# ec2instances.info

> ec2instances.info contains a comprehensive list of pricing and specifications for instance types on various cloud providers.

This file contains information on where to find indexes for instance types we support sorted in different ways.

## Amazon EC2

${awsIndexes.map((i) => urlInject`- [${raw(i.name)} instances](${`/aws/ec2/${i.slug}.md`})`).join("\n")}
${(await getEc2Families()).map((family) => urlInject`- [${raw(family)} instances](${`/aws/ec2/families/${family}.md`})`).join("\n")}

## Amazon RDS

${awsIndexes.map((i) => urlInject`- [${raw(i.name)} instances](${`/aws/rds/${i.slug}.md`})`).join("\n")}
${(await getRdsFamilies()).map((family) => urlInject`- [${raw(family)} instances](${`/aws/rds/families/${family}.md`})`).join("\n")}

## Amazon ElastiCache

${awsIndexes.map((i) => urlInject`- [${raw(i.name)} instances](${`/aws/elasticache/${i.slug}.md`})`).join("\n")}
${(await getElasticacheFamilies()).map((family) => urlInject`- [${raw(family)} instances](${`/aws/elasticache/families/${family}.md`})`).join("\n")}

## Amazon Redshift

${(await redshiftInstances).map((i) => urlInject`- [${raw(i.instance_type)} instance](${`/aws/redshift/${i.instance_type}.md`})`).join("\n")}

## Amazon OpenSearch

${opensearchIndexes.map((i) => urlInject`- [${raw(i.name)} instances](${`/aws/opensearch/${i.slug}.md`})`).join("\n")}
${(await getOpensearchFamilies()).map((family) => urlInject`- [Index of all ${raw(family)} instances](${`/aws/opensearch/families/${family}.md`})`).join("\n")}
`;
