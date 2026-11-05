import componentTests from "@/utils/testing/componentTests";
import Advert from "./Advert";
import { expect, vi } from "vitest";
import { InstanceGroupType, MarketingSchema } from "@/schemas/marketing";

const originalEnv = process.env.NEXT_PUBLIC_REMOVE_ADVERTS;

let pathname = "/";

vi.mock("next/navigation", () => ({
    usePathname: () => pathname,
}));

const genericMockMarketingData: MarketingSchema = {
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
    blogCards: {},
};

componentTests(
    [
        {
            name: "should not render when NEXT_PUBLIC_REMOVE_ADVERTS is 1",
            patch: {
                before: () => {
                    process.env.NEXT_PUBLIC_REMOVE_ADVERTS = "1";
                },
                after: () => {
                    process.env.NEXT_PUBLIC_REMOVE_ADVERTS = originalEnv;
                },
            },
            props: {
                gpu: false,
                instanceGroup: "generic" as InstanceGroupType,
                marketingData: genericMockMarketingData,
            },
            test: (component) => {
                expect(component.container.innerHTML).toBe("");
            },
        },
        {
            name: "should render aws when NEXT_PUBLIC_REMOVE_ADVERTS is not 1",
            patch: {
                before: () => {
                    process.env.NEXT_PUBLIC_REMOVE_ADVERTS = "0";
                    pathname = "/";
                },
                after: () => {
                    process.env.NEXT_PUBLIC_REMOVE_ADVERTS = originalEnv;
                    pathname = "/";
                },
            },
            props: {
                gpu: false,
                instanceGroup: "generic" as InstanceGroupType,
                marketingData: genericMockMarketingData,
            },
            test: (component) => {
                expect(component.container.innerHTML).toContain("Hello");
                const link = component.container.querySelector("a");
                expect(link?.getAttribute("href")).toContain(
                    "utm_source=instances",
                );
                expect(link?.getAttribute("href")).toContain(
                    "utm_medium=banner",
                );
                expect(link?.getAttribute("href")).toContain(
                    "utm_campaign=instances_signup",
                );
                expect(link?.getAttribute("href")).toContain(
                    "utm_content=aws-ec2-home",
                );
            },
        },
    ],
    Advert,
);
