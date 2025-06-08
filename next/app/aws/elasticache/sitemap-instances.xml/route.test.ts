import { GET } from "./route";
import nextAllInstancesSitemapTest from "@/utils/testing/nextAllInstancesSitemapTest";

nextAllInstancesSitemapTest(
    GET,
    "/aws/elasticache",
    "../www/cache/instances.json",
);
