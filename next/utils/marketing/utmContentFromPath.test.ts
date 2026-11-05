import { describe, expect, test } from "vitest";
import { utmContentFromPath } from "./utmContentFromPath";

describe("utmContentFromPath", () => {
    test.each([
        ["/", "aws-ec2-home"],
        ["/rds", "aws-rds-home"],
        ["/cache", "aws-elasticache-home"],
        ["/redshift", "aws-redshift-home"],
        ["/opensearch", "aws-opensearch-home"],
        ["/azure", "azure-vm-home"],
        ["/gcp", "gcp-compute-home"],
        ["/aws/ec2/m5.large", "aws-ec2-m5.large"],
        ["/aws/rds/db.m5.large", "aws-rds-db.m5.large"],
        ["/aws/elasticache/cache.t3.micro", "aws-elasticache-cache.t3.micro"],
        ["/aws/redshift/dc2.large", "aws-redshift-dc2.large"],
        ["/aws/opensearch/m5.large.search", "aws-opensearch-m5.large.search"],
        ["/azure/vm/d4s-v3", "azure-vm-d4s-v3"],
        ["/gcp/n2-standard-4", "gcp-n2-standard-4"],
    ] as const)("%s → %s", (path, expected) => {
        expect(utmContentFromPath(path)).toBe(expected);
    });

    test("strips trailing slash and query", () => {
        expect(utmContentFromPath("/aws/ec2/m5.large/?x=1")).toBe(
            "aws-ec2-m5.large",
        );
    });
});
