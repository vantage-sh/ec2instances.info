import instance from "./mocks/ec2_single_instance.json";
import makeTablesGolden from "./testing/makeTablesGolden";
import { ec2 } from "./ec2TablesGenerator";

// @ts-expect-error: TS isn't good at reading the JSON file
makeTablesGolden("ec2.json", __dirname, () => ec2(instance));
