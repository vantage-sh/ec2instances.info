import React from "react";
import MarketingWrapper from "./MarketingWrapper";
import componentTests from "@/utils/testing/componentTests";
import { expect, vi } from "vitest";
import { RenderResult } from "@testing-library/react";
import { MarketingSchema } from "@/schemas/marketing";

function validateMarketing(component: RenderResult) {
    const cols = component.container.querySelectorAll("div[class='flex-col']");
    expect(cols.length).toBe(2);
    expect(cols[0].innerHTML).toBe("<p>testing 123</p>");
    const items = cols[1].childNodes;
    expect(items.length).toBe(1);
    expect((items[0] as HTMLElement).tagName).toBe("SECTION");
    const links = (items[0] as HTMLElement).childNodes;
    for (const link of links) {
        expect((link as HTMLElement).tagName).toBe("A");
    }
}

let originalEnv: string | undefined;

const testP = React.createElement("p", {}, "testing 123");

vi.mock("next/navigation", () => ({
    usePathname: () => "/",
}));

const sampleCard = {
    title: "Test Card",
    description: "A test blog card",
    image: "https://example.com/image.jpg",
    baseUrl: "https://www.vantage.sh/blog/test",
    utm_medium: "blog-card" as const,
    utm_campaign: "instances_content" as const,
    enabled: true,
};

const mockMarketingData: MarketingSchema = {
    placements: {},
    banners: {
        backgroundImage: "https://example.com/banner.png",
        ctas: {
            hello: {
                title: "Hello",
                cta_text: "Hello",
                baseUrl: "https://www.vantage.sh/",
                utm_medium: "banner",
                utm_campaign: "instances_signup",
                enabled: true,
            },
        },
        promotions: {
            generic: [
                {
                    cta: "hello",
                },
            ],
        },
    },
    toasts: [],
    blogCards: {
        "ec2-flex": [sampleCard],
        "ec2-gpu": [sampleCard],
        "ec2-other": [sampleCard],
        rds: [sampleCard],
        opensearch: [sampleCard],
        redshift: [sampleCard],
        elasticache: [sampleCard],
        azure: [sampleCard],
        gcp: [sampleCard],
    },
};

componentTests(
    [
        {
            name: "renders just child if marketing is disabled in ec2-other mode",
            patch: {
                before: () => {
                    originalEnv = process.env.NEXT_PUBLIC_REMOVE_ADVERTS;
                    process.env.NEXT_PUBLIC_REMOVE_ADVERTS = "1";
                },
                after: () => {
                    process.env.NEXT_PUBLIC_REMOVE_ADVERTS = originalEnv;
                },
            },
            props: {
                instanceType: "ec2-other",
                children: testP,
                marketingData: mockMarketingData,
            },
            test: (component) => {
                expect(component.container.innerHTML).toBe(
                    "<p>testing 123</p>",
                );
            },
        },
        {
            name: "renders just child if marketing is disabled in azure mode",
            patch: {
                before: () => {
                    originalEnv = process.env.NEXT_PUBLIC_REMOVE_ADVERTS;
                    process.env.NEXT_PUBLIC_REMOVE_ADVERTS = "1";
                },
                after: () => {
                    process.env.NEXT_PUBLIC_REMOVE_ADVERTS = originalEnv;
                },
            },
            props: {
                instanceType: "azure",
                children: testP,
                marketingData: mockMarketingData,
            },
            test: (component) => {
                expect(component.container.innerHTML).toBe(
                    "<p>testing 123</p>",
                );
            },
        },
        {
            name: "renders child and marketing in ec2-flex mode",
            patch: {
                before: () => {
                    originalEnv = process.env.NEXT_PUBLIC_REMOVE_ADVERTS;
                    process.env.NEXT_PUBLIC_REMOVE_ADVERTS = "";
                },
                after: () => {
                    process.env.NEXT_PUBLIC_REMOVE_ADVERTS = originalEnv;
                },
            },
            props: {
                instanceType: "ec2-flex",
                children: testP,
                marketingData: mockMarketingData,
            },
            test: validateMarketing,
        },
        {
            name: "renders child and marketing in ec2-gpu mode",
            patch: {
                before: () => {
                    originalEnv = process.env.NEXT_PUBLIC_REMOVE_ADVERTS;
                    process.env.NEXT_PUBLIC_REMOVE_ADVERTS = "";
                },
                after: () => {
                    process.env.NEXT_PUBLIC_REMOVE_ADVERTS = originalEnv;
                },
            },
            props: {
                instanceType: "ec2-gpu",
                children: testP,
                marketingData: mockMarketingData,
            },
            test: validateMarketing,
        },
        {
            name: "renders child and marketing in ec2-other mode",
            patch: {
                before: () => {
                    originalEnv = process.env.NEXT_PUBLIC_REMOVE_ADVERTS;
                    process.env.NEXT_PUBLIC_REMOVE_ADVERTS = "";
                },
                after: () => {
                    process.env.NEXT_PUBLIC_REMOVE_ADVERTS = originalEnv;
                },
            },
            props: {
                instanceType: "ec2-other",
                children: testP,
                marketingData: mockMarketingData,
            },
            test: validateMarketing,
        },
        {
            name: "renders child and marketing in rds mode",
            patch: {
                before: () => {
                    originalEnv = process.env.NEXT_PUBLIC_REMOVE_ADVERTS;
                    process.env.NEXT_PUBLIC_REMOVE_ADVERTS = "";
                },
                after: () => {
                    process.env.NEXT_PUBLIC_REMOVE_ADVERTS = originalEnv;
                },
            },
            props: {
                instanceType: "rds",
                children: testP,
                marketingData: mockMarketingData,
            },
            test: validateMarketing,
        },
        {
            name: "renders child and marketing in opensearch mode",
            patch: {
                before: () => {
                    originalEnv = process.env.NEXT_PUBLIC_REMOVE_ADVERTS;
                    process.env.NEXT_PUBLIC_REMOVE_ADVERTS = "";
                },
                after: () => {
                    process.env.NEXT_PUBLIC_REMOVE_ADVERTS = originalEnv;
                },
            },
            props: {
                instanceType: "opensearch",
                children: testP,
                marketingData: mockMarketingData,
            },
            test: validateMarketing,
        },
        {
            name: "renders child and marketing in redshift mode",
            patch: {
                before: () => {
                    originalEnv = process.env.NEXT_PUBLIC_REMOVE_ADVERTS;
                    process.env.NEXT_PUBLIC_REMOVE_ADVERTS = "";
                },
                after: () => {
                    process.env.NEXT_PUBLIC_REMOVE_ADVERTS = originalEnv;
                },
            },
            props: {
                instanceType: "redshift",
                children: testP,
                marketingData: mockMarketingData,
            },
            test: validateMarketing,
        },
        {
            name: "renders child and marketing in elasticache mode",
            patch: {
                before: () => {
                    originalEnv = process.env.NEXT_PUBLIC_REMOVE_ADVERTS;
                    process.env.NEXT_PUBLIC_REMOVE_ADVERTS = "";
                },
                after: () => {
                    process.env.NEXT_PUBLIC_REMOVE_ADVERTS = originalEnv;
                },
            },
            props: {
                instanceType: "elasticache",
                children: testP,
                marketingData: mockMarketingData,
            },
            test: validateMarketing,
        },
        {
            name: "renders child and marketing in azure mode",
            patch: {
                before: () => {
                    originalEnv = process.env.NEXT_PUBLIC_REMOVE_ADVERTS;
                    process.env.NEXT_PUBLIC_REMOVE_ADVERTS = "";
                },
                after: () => {
                    process.env.NEXT_PUBLIC_REMOVE_ADVERTS = originalEnv;
                },
            },
            props: {
                instanceType: "azure",
                children: testP,
                marketingData: mockMarketingData,
            },
            test: validateMarketing,
        },
    ],
    MarketingWrapper,
);
