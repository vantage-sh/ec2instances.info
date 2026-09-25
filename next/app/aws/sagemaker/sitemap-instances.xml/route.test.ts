import { vi } from "vitest";
import nextSitemapTest from "@/utils/testing/nextSitemapTest";

vi.mock("fs/promises", () => ({
    readFile: async () =>
        JSON.stringify([
            { instance_type: "ml.c4.2xlarge" },
            { instance_type: "ml.g5.xlarge" },
        ]),
}));

import { GET } from "./route";

nextSitemapTest(GET, [
    "/aws/sagemaker/ml.c4.2xlarge",
    "/aws/sagemaker/ml.g5.xlarge",
]);
