import nextSitemapTest from "./nextSitemapTest";
import { join } from "path";
import { readFileSync } from "fs";

export default function nextAllInstancesSitemapTest(
    getMethod: (req: Request) => Promise<Response>,
    pathPrefix: string,
    instancesJsonPathRelativeToNextRoot: string,
) {
    const instancesJsonPath = join(
        __dirname,
        "..",
        "..",
        instancesJsonPathRelativeToNextRoot,
    );
    const instancesJson = JSON.parse(
        readFileSync(instancesJsonPath, "utf-8"),
    ) as { instance_type: string }[];
    const paths = instancesJson.map(
        (instance) => `${pathPrefix}/${instance.instance_type}`,
    );
    nextSitemapTest(getMethod, paths);
}
