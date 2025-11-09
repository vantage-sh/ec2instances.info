import { afterAll, beforeAll, expect, vi } from "vitest";
import componentTests from "@/utils/testing/componentTests";
import TopNav from "./TopNav";
import { RenderResult } from "@testing-library/react";

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
                href: "/",
                ariaCurrent: AWS_PATHS.includes(pathLitUp),
            },
            {
                label: "EC2",
                href: "/",
                ariaCurrent: pathLitUp === "/",
            },
            {
                label: "RDS",
                href: "/rds",
                ariaCurrent: pathLitUp === "/rds",
            },
            {
                label: "ElastiCache",
                href: "/cache",
                ariaCurrent: pathLitUp === "/cache",
            },
            {
                label: "Redshift",
                href: "/redshift",
                ariaCurrent: pathLitUp === "/redshift",
            },
            {
                label: "OpenSearch",
                href: "/opensearch",
                ariaCurrent: pathLitUp === "/opensearch",
            },
            {
                label: "Azure",
                href: "/azure",
                ariaCurrent: pathLitUp === "/azure",
            },
            {
                label: "GCP",
                href: "/gcp",
                ariaCurrent: pathLitUp === "/gcp",
            },
        ];
        expect(formatted).toEqual(expected);
    };
}

let mockPath = "/";

beforeAll(() => {
    vi.mock("next/navigation", () => ({
        usePathname: vi.fn().mockImplementation(() => mockPath),
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
            props: {},
            patch: {
                before: () => {
                    mockPath = "/";
                },
            },
            test: runSelectedTest("/"),
        },
        {
            name: "EC2 instance lights up EC2",
            props: {},
            patch: {
                before: () => {
                    mockPath = "/aws/ec2/123";
                },
            },
            test: runSelectedTest("/"),
        },

        // RDS

        {
            name: "RDS lights up RDS when on table page",
            props: {},
            patch: {
                before: () => {
                    mockPath = "/rds";
                },
            },
            test: runSelectedTest("/rds"),
        },
        {
            name: "RDS lights up RDS when on instance page",
            props: {},
            patch: {
                before: () => {
                    mockPath = "/aws/rds/123";
                },
            },
            test: runSelectedTest("/rds"),
        },

        // ElastiCache

        {
            name: "ElastiCache lights up ElastiCache when on table page",
            props: {},
            patch: {
                before: () => {
                    mockPath = "/cache";
                },
            },
            test: runSelectedTest("/cache"),
        },
        {
            name: "ElastiCache lights up ElastiCache when on instance page",
            props: {},
            patch: {
                before: () => {
                    mockPath = "/aws/elasticache/123";
                },
            },
            test: runSelectedTest("/cache"),
        },

        // Redshift

        {
            name: "Redshift lights up Redshift when on table page",
            props: {},
            patch: {
                before: () => {
                    mockPath = "/redshift";
                },
            },
            test: runSelectedTest("/redshift"),
        },
        {
            name: "Redshift lights up Redshift when on instance page",
            props: {},
            patch: {
                before: () => {
                    mockPath = "/aws/redshift/123";
                },
            },
            test: runSelectedTest("/redshift"),
        },

        // OpenSearch

        {
            name: "OpenSearch lights up OpenSearch when on table page",
            props: {},
            patch: {
                before: () => {
                    mockPath = "/opensearch";
                },
            },
            test: runSelectedTest("/opensearch"),
        },
        {
            name: "OpenSearch lights up OpenSearch when on instance page",
            props: {},
            patch: {
                before: () => {
                    mockPath = "/aws/opensearch/123";
                },
            },
            test: runSelectedTest("/opensearch"),
        },

        // Azure

        {
            name: "Azure lights up Azure when on table page",
            props: {},
            patch: {
                before: () => {
                    mockPath = "/azure";
                },
            },
            test: runSelectedTest("/azure"),
        },
        {
            name: "Azure lights up Azure when on instance page",
            props: {},
            patch: {
                before: () => {
                    mockPath = "/azure/vm/123";
                },
            },
            test: runSelectedTest("/azure"),
        },

        // GCP

        {
            name: "GCP lights up GCP when on table page",
            props: {},
            patch: {
                before: () => {
                    mockPath = "/gcp";
                },
            },
            test: runSelectedTest("/gcp"),
        },
        {
            name: "GCP lights up GCP when on instance page",
            props: {},
            patch: {
                before: () => {
                    mockPath = "/gcp/123";
                },
            },
            test: runSelectedTest("/gcp"),
        },
    ],
    TopNav,
);
