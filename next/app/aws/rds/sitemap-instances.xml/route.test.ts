import { GET } from "./route";
import nextAllInstancesSitemapTest from "@/utils/testing/nextAllInstancesSitemapTest";

nextAllInstancesSitemapTest(GET, "/aws/rds", "../www/rds/instances.json");
