import makeTablesGolden from "./testing/makeTablesGolden";
import generateOpensearchTables from "./generateOpensearchTables";
import instances from "../../www/opensearch/instances.json";

const singleInstance = instances.find(
    (v) => v.instanceType === "m5.large.search",
)!;

makeTablesGolden("opensearch.json", __dirname, () =>
    // @ts-expect-error: TS isn't good at reading the JSON file
    generateOpensearchTables(singleInstance),
);
