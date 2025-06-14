import azureTablesGenerator from "./azureTablesGenerator";
import makeTablesGolden from "./testing/makeTablesGolden";
import instances from "./workers/mocks/azure-instances-roughly-10-jun-2025.json";

const singleInstance = (instances as any[]).find(
    (i) => i.instance_type === "d2",
)!;

makeTablesGolden("azure.json", __dirname, () =>
    azureTablesGenerator(singleInstance),
);
