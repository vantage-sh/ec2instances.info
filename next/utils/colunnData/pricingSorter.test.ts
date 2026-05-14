import { describe, test, expect } from "vitest";
import {
    createTable,
    getCoreRowModel,
    getSortedRowModel,
    getFilteredRowModel,
    ColumnDef,
} from "@tanstack/react-table";
import { Instance, columnsGen } from "./opensearch";

// Real opensearch instances with memory 64 GiB from us-east-1
const REGION = "us-east-1";
const RESERVED_TERM = "yrTerm1Standard.noUpfront";
const CURRENCY = { code: "USD", usdRate: 1, cnyRate: 1 };

function makeInstance(
    name: string,
    ondemand: string,
    reserved: string,
): Instance {
    return {
        instance_type: name,
        pretty_name: name,
        memoryGib: "64",
        vcpu: "8",
        storage: "EBS only",
        ecu: "0",
        currentGeneration: "Yes",
        family: "General purpose",
        memory: "64",
        pricing: {
            [REGION]: {
                ondemand,
                reserved: { [RESERVED_TERM]: reserved },
            },
        },
    };
}

// Actual data from www/opensearch/instances.json, memory=64, us-east-1
const mem64Instances: Instance[] = [
    makeInstance("r6g.2xlarge.search", "0.669", "0.462"),
    makeInstance("r7g.2xlarge.search", "0.711", "0.491"),
    makeInstance("r5.2xlarge.search", "0.743", "0.513"),
    makeInstance("r8g.2xlarge.search", "0.783", "0.54"),
    makeInstance("r6gd.2xlarge.search", "0.765", "0.528"),
    makeInstance("or2.2xlarge.search", "0.8", "0.552"),
    makeInstance("or1.2xlarge.search", "0.836", "0.577"),
    makeInstance("r7i.2xlarge.search", "0.847", "0.584"),
    makeInstance("r7gd.2xlarge.search", "0.904", "0.624"),
    makeInstance("r8gd.2xlarge.search", "0.976", "0.673"),
    makeInstance("i4g.2xlarge.search", "0.988", "0.682"),
    makeInstance("i4i.2xlarge.search", "1.098", "0.758"),
    makeInstance("i8g.2xlarge.search", "1.098", "0.758"),
    makeInstance("m6g.4xlarge.search", "1.023", "0.706"),
    makeInstance("m7g.4xlarge.search", "1.084", "0.748"),
    makeInstance("m5.4xlarge.search", "1.133", "0.782"),
    makeInstance("oi2.2xlarge.search", "1.16688", "0.805"),
    makeInstance("m8g.4xlarge.search", "1.193", "0.823"),
    makeInstance("m4.4xlarge.search", "1.207", "0.833"),
    makeInstance("i7i.2xlarge.search", "1.208", "0.834"),
    makeInstance("om2.4xlarge.search", "1.221", "0.842"),
    makeInstance("m7i.4xlarge.search", "1.29", "0.89"),
    makeInstance("c6g.8xlarge.search", "1.806", "1.246"),
    makeInstance("c7g.8xlarge.search", "1.926", "1.329"),
    makeInstance("c8g.8xlarge.search", "2.119", "1.462"),
    makeInstance("i8ge.2xlarge.search", "1.519", "1.048"),
    makeInstance("im4gn.4xlarge.search", "2.183", "1.506"),
    makeInstance("c7i.8xlarge.search", "2.285", "1.577"),
];

function getSortedNames(
    instances: Instance[],
    sortColumn: string,
    desc: boolean,
): string[] {
    const columns = columnsGen(
        REGION,
        "instance",
        "hourly",
        RESERVED_TERM,
        CURRENCY,
    );
    for (const col of columns) {
        col.sortUndefined = 1;
    }

    const table = createTable({
        data: instances,
        columns: columns as ColumnDef<Instance, any>[],
        state: {
            sorting: [{ id: sortColumn, desc }],
            columnFilters: [],
        },
        onStateChange: () => {},
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getRowId: (row) => row.instance_type,
        renderFallbackValue: null,
    });

    return table
        .getSortedRowModel()
        .rows.map((r) => r.original.instance_type);
}

describe("pricing sorter (opensearch data)", () => {
    test("sorting by reserved cost ascending produces correct order", () => {
        // Shuffle to avoid relying on initial order
        const shuffled = [...mem64Instances].sort(
            () => ((7 * Math.random()) | 0) - 3,
        );

        const sorted = getSortedNames(shuffled, "cost-reserved", false);

        // Extract reserved prices in the sorted order
        const prices = sorted.map((name) => {
            const inst = mem64Instances.find(
                (i) => i.instance_type === name,
            )!;
            return Number(
                inst.pricing[REGION].reserved![RESERVED_TERM],
            );
        });

        // Every price should be >= the previous one
        for (let i = 1; i < prices.length; i++) {
            expect(prices[i]).toBeGreaterThanOrEqual(prices[i - 1]!);
        }
    });

    test("sorting by reserved cost descending produces correct order", () => {
        const shuffled = [...mem64Instances].sort(
            () => ((7 * Math.random()) | 0) - 3,
        );

        const sorted = getSortedNames(shuffled, "cost-reserved", true);

        const prices = sorted.map((name) => {
            const inst = mem64Instances.find(
                (i) => i.instance_type === name,
            )!;
            return Number(
                inst.pricing[REGION].reserved![RESERVED_TERM],
            );
        });

        for (let i = 1; i < prices.length; i++) {
            expect(prices[i]).toBeLessThanOrEqual(prices[i - 1]!);
        }
    });

    test("sorting by on-demand cost ascending produces correct order", () => {
        const shuffled = [...mem64Instances].sort(
            () => ((7 * Math.random()) | 0) - 3,
        );

        const sorted = getSortedNames(shuffled, "cost-ondemand", false);

        const prices = sorted.map((name) => {
            const inst = mem64Instances.find(
                (i) => i.instance_type === name,
            )!;
            return Number(inst.pricing[REGION].ondemand);
        });

        for (let i = 1; i < prices.length; i++) {
            expect(prices[i]).toBeGreaterThanOrEqual(prices[i - 1]!);
        }
    });
});
