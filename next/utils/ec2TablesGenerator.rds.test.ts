import { expect, test } from "vitest";
import { rds } from "./ec2TablesGenerator";
import type { EC2Instance } from "@/types";

const instance = {
    instance_type: "db.m7i.2xlarge",
    pretty_name: "M7i 2xlarge",
    family: "General purpose",
    vCPU: 8,
    vcpu_by_engine: {
        MySQL: "8",
        "2": "8",
        "SQL Server": "4",
        "12": "4",
    },
    memory: 32,
    physical_processor: "Intel Xeon",
    arch: ["x86_64"],
    ebs_optimized: true,
    ebs_baseline_bandwidth: 0,
    ebs_baseline_throughput: 0,
    ebs_baseline_iops: 0,
    ebs_max_bandwidth: 0,
    ebs_throughput: 0,
    ebs_iops: 0,
    network_performance: "Up to 12.5 Gigabit",
    generation: "current",
    normalizationSizeFactor: "16",
} as unknown as Omit<EC2Instance, "pricing">;

function vcpuFor(platform?: string) {
    return rds(instance, platform)[0].rows.find((row) => row.name === "vCPUs")
        ?.children;
}

test("RDS details can show engine-specific vCPU counts", () => {
    expect(vcpuFor("MySQL")).toBe("8");
    expect(vcpuFor("2")).toBe("8");
    expect(vcpuFor("SQL Server")).toBe("4");
    expect(vcpuFor("12")).toBe("4");
    expect(vcpuFor("403")).toBe("4");
    expect(vcpuFor("230")).toBe("4");
    expect(vcpuFor()).toBe(8);
});

test("RDS details omit the Database Engines section without engine_support", () => {
    const tables = rds(instance);
    expect(tables.find((t) => t.slug === "database-engines")).toBeUndefined();
});

test("RDS details render supported engine version ranges", () => {
    const withSupport = {
        ...instance,
        engine_support: {
            postgres: { min: "11", max: "18" },
            mysql: { min: "8.0", max: "8.4" },
            "oracle-ee": { min: "19", max: "19" },
        },
    } as unknown as Omit<EC2Instance, "pricing">;

    const section = rds(withSupport).find((t) => t.slug === "database-engines");
    expect(section).toBeDefined();

    const byName = Object.fromEntries(
        section!.rows.map((r) => [r.name, r.children]),
    );
    expect(byName["PostgreSQL"]).toBe("11 - 18");
    expect(byName["MySQL"]).toBe("8.0 - 8.4");
    // Equal min/max collapses to a single version.
    expect(byName["Oracle Enterprise Edition"]).toBe("19");
});
