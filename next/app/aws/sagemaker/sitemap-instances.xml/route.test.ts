import { GET } from "./route";
import nextAllInstancesSitemapTest from "@/utils/testing/nextAllInstancesSitemapTest";

nextAllInstancesSitemapTest(
    GET,
    "/aws/sagemaker",
    "../www/sagemaker/instances.json",
);
