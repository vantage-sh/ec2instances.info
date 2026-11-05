/**
 * Derive utm_content from the current pathname.
 * Detail pages: cloud-service-instance (GCP omits service: cloud-instance)
 * Homepages: cloud-service-home
 */
export function utmContentFromPath(pathname: string): string {
    const path = pathname.split("?")[0].replace(/\/+$/, "") || "/";

    if (path === "/") return "aws-ec2-home";
    if (path === "/rds") return "aws-rds-home";
    if (path === "/cache") return "aws-elasticache-home";
    if (path === "/redshift") return "aws-redshift-home";
    if (path === "/opensearch") return "aws-opensearch-home";
    if (path === "/azure") return "azure-vm-home";
    if (path === "/gcp") return "gcp-compute-home";

    const awsEc2 = path.match(/^\/aws\/ec2\/([^/]+)$/);
    if (awsEc2) return `aws-ec2-${awsEc2[1]}`;

    const awsRds = path.match(/^\/aws\/rds\/([^/]+)$/);
    if (awsRds) return `aws-rds-${awsRds[1]}`;

    const awsCache = path.match(/^\/aws\/elasticache\/([^/]+)$/);
    if (awsCache) return `aws-elasticache-${awsCache[1]}`;

    const awsRedshift = path.match(/^\/aws\/redshift\/([^/]+)$/);
    if (awsRedshift) return `aws-redshift-${awsRedshift[1]}`;

    const awsOpensearch = path.match(/^\/aws\/opensearch\/([^/]+)$/);
    if (awsOpensearch) return `aws-opensearch-${awsOpensearch[1]}`;

    const azureVm = path.match(/^\/azure\/vm\/([^/]+)$/);
    if (azureVm) return `azure-vm-${azureVm[1]}`;

    const gcp = path.match(/^\/gcp\/([^/]+)$/);
    if (gcp) return `gcp-${gcp[1]}`;

    return "aws-ec2-home";
}
