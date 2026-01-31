import { afterAll, beforeAll, expect, vi } from "vitest";
import componentTests from "@/utils/testing/componentTests";
import TopNav from "./TopNav";
import { RenderResult } from "@testing-library/react";

const LOCALE = "en-GB";
const AWS_PATHS = ["/", "/rds", "/cache", "/redshift", "/opensearch"];

function runSelectedTest(pathLitUp: string) {
    return (component: RenderResult) => {
        const currents =
            component.container.querySelectorAll("a[aria-current]");
        const formatted = Array.from(currents).map((c) => ({
            label: c.textContent,
            href: c.getAttribute("href"),
            ariaCurrent: c.getAttribute("aria-current") === "true",
        }));
        const expected = [
            {
                label: "AWS",
                href: `/${LOCALE}`,
                ariaCurrent: AWS_PATHS.includes(pathLitUp),
            },
            {
                label: "EC2",
                href: `/${LOCALE}`,
                ariaCurrent: pathLitUp === "/",
            },
            {
                label: "RDS",
                href: `/${LOCALE}/rds`,
                ariaCurrent: pathLitUp === "/rds",
            },
            {
                label: "ElastiCache",
                href: `/${LOCALE}/cache`,
                ariaCurrent: pathLitUp === "/cache",
            },
            {
                label: "Redshift",
                href: `/${LOCALE}/redshift`,
                ariaCurrent: pathLitUp === "/redshift",
            },
            {
                label: "OpenSearch",
                href: `/${LOCALE}/opensearch`,
                ariaCurrent: pathLitUp === "/opensearch",
            },
            {
                label: "Azure",
                href: `/${LOCALE}/azure`,
                ariaCurrent: pathLitUp === "/azure",
            },
            {
                label: "GCP",
                href: `/${LOCALE}/gcp`,
                ariaCurrent: pathLitUp === "/gcp",
            },
        ];
        expect(formatted).toEqual(expected);
    };
}

let mockPath = `/${LOCALE}`;

const mockTranslations: Record<string, string> = {
    "nav.aws": "AWS",
    "nav.ec2": "EC2",
    "nav.rds": "RDS",
    "nav.elasticache": "ElastiCache",
    "nav.redshift": "Redshift",
    "nav.opensearch": "OpenSearch",
    "nav.azure": "Azure",
    "nav.gcp": "GCP",
    "nav.instances": "Cloud Instances",
    "nav.presentedBy": "by Vantage",
    "nav.getNotified": "Get Notified",
    "nav.mcp": "MCP",
    "nav.star": "Star",
    "localeSwitcher.label": "Language",
};

beforeAll(() => {
    vi.mock("next/navigation", () => ({
        usePathname: vi.fn().mockImplementation(() => mockPath),
    }));
    vi.mock("gt-next", () => ({
        useTranslations: vi.fn().mockImplementation(() => (key: string) => {
            return mockTranslations[key] || key;
        }),
    }));
});

afterAll(() => {
    vi.clearAllMocks();
});

componentTests(
    [
        // EC2

        {
            name: "root path lights up EC2",
            props: { locale: LOCALE },
            patch: {
                before: () => {
                    mockPath = `/${LOCALE}`;
                },
            },
            test: runSelectedTest("/"),
        },
        {
            name: "EC2 instance lights up EC2",
            props: { locale: LOCALE },
            patch: {
                before: () => {
                    mockPath = `/${LOCALE}/aws/ec2/123`;
                },
            },
            test: runSelectedTest("/"),
        },

        // RDS

        {
            name: "RDS lights up RDS when on table page",
            props: { locale: LOCALE },
            patch: {
                before: () => {
                    mockPath = `/${LOCALE}/rds`;
                },
            },
            test: runSelectedTest("/rds"),
        },
        {
            name: "RDS lights up RDS when on instance page",
            props: { locale: LOCALE },
            patch: {
                before: () => {
                    mockPath = `/${LOCALE}/aws/rds/123`;
                },
            },
            test: runSelectedTest("/rds"),
        },

        // ElastiCache

        {
            name: "ElastiCache lights up ElastiCache when on table page",
            props: { locale: LOCALE },
            patch: {
                before: () => {
                    mockPath = `/${LOCALE}/cache`;
                },
            },
            test: runSelectedTest("/cache"),
        },
        {
            name: "ElastiCache lights up ElastiCache when on instance page",
            props: { locale: LOCALE },
            patch: {
                before: () => {
                    mockPath = `/${LOCALE}/aws/elasticache/123`;
                },
            },
            test: runSelectedTest("/cache"),
        },

        // Redshift

        {
            name: "Redshift lights up Redshift when on table page",
            props: { locale: LOCALE },
            patch: {
                before: () => {
                    mockPath = `/${LOCALE}/redshift`;
                },
            },
            test: runSelectedTest("/redshift"),
        },
        {
            name: "Redshift lights up Redshift when on instance page",
            props: { locale: LOCALE },
            patch: {
                before: () => {
                    mockPath = `/${LOCALE}/aws/redshift/123`;
                },
            },
            test: runSelectedTest("/redshift"),
        },

        // OpenSearch

        {
            name: "OpenSearch lights up OpenSearch when on table page",
            props: { locale: LOCALE },
            patch: {
                before: () => {
                    mockPath = `/${LOCALE}/opensearch`;
                },
            },
            test: runSelectedTest("/opensearch"),
        },
        {
            name: "OpenSearch lights up OpenSearch when on instance page",
            props: { locale: LOCALE },
            patch: {
                before: () => {
                    mockPath = `/${LOCALE}/aws/opensearch/123`;
                },
            },
            test: runSelectedTest("/opensearch"),
        },

        // Azure

        {
            name: "Azure lights up Azure when on table page",
            props: { locale: LOCALE },
            patch: {
                before: () => {
                    mockPath = `/${LOCALE}/azure`;
                },
            },
            test: runSelectedTest("/azure"),
        },
        {
            name: "Azure lights up Azure when on instance page",
            props: { locale: LOCALE },
            patch: {
                before: () => {
                    mockPath = `/${LOCALE}/azure/vm/123`;
                },
            },
            test: runSelectedTest("/azure"),
        },

        // GCP

        {
            name: "GCP lights up GCP when on table page",
            props: { locale: LOCALE },
            patch: {
                before: () => {
                    mockPath = `/${LOCALE}/gcp`;
                },
            },
            test: runSelectedTest("/gcp"),
        },
        {
            name: "GCP lights up GCP when on instance page",
            props: { locale: LOCALE },
            patch: {
                before: () => {
                    mockPath = `/${LOCALE}/gcp/123`;
                },
            },
            test: runSelectedTest("/gcp"),
        },
    ],
    TopNav,
);
