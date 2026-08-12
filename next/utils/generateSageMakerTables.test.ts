import makeTablesGolden from "./testing/makeTablesGolden";
import generateSageMakerTables from "./generateSageMakerTables";
import type { Instance } from "./colunnData/sagemaker";

const singleInstance: Instance = {
    pretty_name: "C4 Compute Optimized Double Extra Large",
    instance_type: "ml.c4.2xlarge",
    family: "c4",
    compute_family: "Compute Optimized Instances",
    vCPU: 8,
    memory: 15,
    network_performance: "High",
    GPU: 0,
    generation: "Yes",
    storage: "EBS only",
    ebs_optimized: true,
    ebs_baseline_throughput: 125,
    ebs_baseline_iops: 8000,
    ebs_baseline_bandwidth: 1000,
    ebs_throughput: 125,
    ebs_iops: 8000,
    ebs_max_bandwidth: 1000,
    pricing: {},
    regions: {},
};

makeTablesGolden("sagemaker.json", __dirname, () =>
    generateSageMakerTables(singleInstance),
);
