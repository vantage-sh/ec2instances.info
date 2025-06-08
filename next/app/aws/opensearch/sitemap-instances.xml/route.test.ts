import { GET } from "./route";
import nextAllInstancesSitemapTest from "@/utils/testing/nextAllInstancesSitemapTest";

nextAllInstancesSitemapTest(
    GET,
    "/aws/opensearch",
    "../www/opensearch/instances.json",
);
