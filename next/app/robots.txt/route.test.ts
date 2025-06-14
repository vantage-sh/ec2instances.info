import { GET } from "./route";
import nextGetRouteTest from "@/utils/testing/nextGetRouteTest";
import { expect } from "vitest";

const allowRobots = `User-agent: *
Allow: /
Sitemap: http://example.com/sitemap_index.xml
`;

const denyRobots = `User-agent: *
Disallow: /`;

nextGetRouteTest(
    "robots.txt defaults to allow",
    GET,
    (content) => expect(content).toEqual(allowRobots),
    {
        DENY_ROBOTS_TXT: "",
        NEXT_PUBLIC_URL: "http://example.com",
    },
);

nextGetRouteTest(
    "robots.txt set to deny",
    GET,
    (content) => expect(content).toEqual(denyRobots),
    {
        DENY_ROBOTS_TXT: "1",
    },
);
