import { GET } from "./route";
import nextSitemapTest from "@/utils/testing/nextSitemapTest";
import { SUPPORTED_LOCALES } from "@/utils/localeConstants";

const SECTION_PATHS = [
    "/",
    "/azure",
    "/gcp",
    "/rds",
    "/cache",
    "/opensearch",
    "/redshift",
];

nextSitemapTest(
    GET,
    SUPPORTED_LOCALES.flatMap((locale) =>
        SECTION_PATHS.map((path) =>
            path === "/" ? `/${locale}` : `/${locale}${path}`,
        ),
    ),
);
