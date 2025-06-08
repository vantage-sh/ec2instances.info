import { GET } from "./route";
import nextAllInstancesSitemapTest from "@/utils/testing/nextAllInstancesSitemapTest";

nextAllInstancesSitemapTest(
    GET,
    "/aws/redshift",
    "../www/redshift/instances.json",
);
