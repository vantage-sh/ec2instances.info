import { describe, expect, test } from "vitest";
import { buildVantageUrl } from "./buildVantageUrl";

describe("buildVantageUrl", () => {
    test("adds source, medium, and campaign", () => {
        expect(
            buildVantageUrl("https://www.vantage.sh/", {
                medium: "banner",
                campaign: "instances_signup",
            }),
        ).toBe(
            "https://www.vantage.sh/?utm_source=instances&utm_medium=banner&utm_campaign=instances_signup",
        );
    });

    test("adds content when provided", () => {
        expect(
            buildVantageUrl("https://www.vantage.sh/", {
                medium: "banner",
                campaign: "instances_signup",
                content: "aws-ec2-home",
            }),
        ).toBe(
            "https://www.vantage.sh/?utm_source=instances&utm_medium=banner&utm_campaign=instances_signup&utm_content=aws-ec2-home",
        );
    });

    test("encodes instance-type content with dots", () => {
        const url = buildVantageUrl(
            "https://www.vantage.sh/lp/aws-instances-demo",
            {
                medium: "sidebar",
                campaign: "instances_demo",
                content: "aws-ec2-m5.large",
            },
        );
        expect(url).toContain("utm_content=aws-ec2-m5.large");
        expect(new URL(url).searchParams.get("utm_content")).toBe(
            "aws-ec2-m5.large",
        );
    });

    test("preserves existing query params", () => {
        const url = buildVantageUrl("https://www.vantage.sh/blog/post?ref=x", {
            medium: "blog-card",
            campaign: "instances_content",
            content: "rds",
        });
        const parsed = new URL(url);
        expect(parsed.searchParams.get("ref")).toBe("x");
        expect(parsed.searchParams.get("utm_source")).toBe("instances");
        expect(parsed.searchParams.get("utm_medium")).toBe("blog-card");
        expect(parsed.searchParams.get("utm_campaign")).toBe(
            "instances_content",
        );
        expect(parsed.searchParams.get("utm_content")).toBe("rds");
    });

    test("overwrites existing utm params", () => {
        const url = buildVantageUrl(
            "https://tokens.vantage.sh/?utm_source=old&utm_campaign=stale",
            {
                medium: "banner",
                campaign: "instances_signup",
                content: "azure-vm-home",
            },
        );
        const parsed = new URL(url);
        expect(parsed.searchParams.get("utm_source")).toBe("instances");
        expect(parsed.searchParams.get("utm_campaign")).toBe(
            "instances_signup",
        );
        expect(parsed.searchParams.get("utm_medium")).toBe("banner");
        expect(parsed.searchParams.get("utm_content")).toBe("azure-vm-home");
    });

    test("skips empty content", () => {
        const url = buildVantageUrl("https://cur.vantage.sh/", {
            medium: "inline",
            campaign: "instances_crosspromo",
            content: "",
        });
        expect(new URL(url).searchParams.has("utm_content")).toBe(false);
    });
});
