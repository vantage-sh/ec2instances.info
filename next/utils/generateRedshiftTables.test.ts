import makeTablesGolden from "./testing/makeTablesGolden";
import generateRedshiftTables from "./generateRedshiftTables";
import instances from "../../www/redshift/instances.json";

const singleInstance = instances.find((v) => v.instanceType === "dc2.large")!;

makeTablesGolden("redshift.json", __dirname, () =>
    // @ts-expect-error: TS isn't good at reading the JSON file
    generateRedshiftTables(singleInstance),
);
