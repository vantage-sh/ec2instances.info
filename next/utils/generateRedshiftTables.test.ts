import makeTablesGolden from "./testing/makeTablesGolden";
import generateRedshiftTables from "./generateRedshiftTables";
import type { Instance } from "./colunnData/redshift";

const singleInstance: Instance = {
    currentGeneration: "Yes",
    ecu: "7",
    family: "Dense Compute",
    generation: "current",
    instance_type: "dc2.large",
    io: "0.60 GB/s",
    memory: "15",
    node_range: "1–32",
    pretty_name: "Dense Compute DC2 Large",
    pricing: {},
    slices_per_node: "2",
    storage: "0.16TB SSD",
    storage_capacity: "5.12 TB",
    storage_per_node: "160 GB NVMe-SSD",
    vcpu: "2",
};

makeTablesGolden("redshift.json", __dirname, () =>
    generateRedshiftTables(singleInstance),
);
