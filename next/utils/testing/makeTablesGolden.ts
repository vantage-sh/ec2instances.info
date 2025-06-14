import { mkdir, readFile, writeFile } from "fs/promises";
import { join } from "path";
import { expect, test } from "vitest";
import type { Table } from "../ec2TablesGenerator";

export default function makeTablesGolden(
    jsonFilename: string,
    dirname: string,
    handler: () => Table[],
) {
    test(`golden tests for ${jsonFilename}`, async () => {
        await mkdir(join(dirname, "golden"), { recursive: true });
        const fp = join(dirname, "golden", jsonFilename);
        const res = handler();
        const json = JSON.stringify(res, null, 4);
        if (process.env.GOLDEN_UPDATE === "1") {
            await writeFile(fp, json);
        } else {
            let data: string;
            try {
                data = await readFile(fp, "utf-8");
            } catch (e) {
                throw new Error(
                    `Unable to read ${fp}, do GOLDEN_UPDATE=1 if this is a new file: ${e instanceof Error ? e.message : e}`,
                );
            }
            const content = JSON.parse(data);
            expect(res).toEqual(content);
        }
    });
}
