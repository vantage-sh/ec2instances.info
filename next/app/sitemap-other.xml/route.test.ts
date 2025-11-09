import { GET } from "./route";
import nextSitemapTest from "@/utils/testing/nextSitemapTest";

nextSitemapTest(GET, [
    "/",
    "/azure",
    "/rds",
    "/cache",
    "/opensearch",
    "/redshift",
    "/gcp",
]);
