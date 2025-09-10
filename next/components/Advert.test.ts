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
    ctas: {
        hello: {
            title: "Hello",
            cta_text: "Hello",
            cta_url: "https://www.vantage.sh",
        },
    },
    promotions: {
        generic: [
            {
                cta: "hello",
            },
        ],
    },
};

const fetchBefore = window.fetch;

const stubFetchWithError = {
    before: () => {
        window.fetch = () => Promise.reject(new Error("test"));
    },
    after: () => {
        window.fetch = fetchBefore;
    },
};

componentTests(
    [
        {
            name: "should not render when NEXT_PUBLIC_REMOVE_ADVERTS is 1",
            patch: {
                before: () => {
                    process.env.NEXT_PUBLIC_REMOVE_ADVERTS = "1";
                    stubFetchWithError.before();
                },
                after: () => {
                    process.env.NEXT_PUBLIC_REMOVE_ADVERTS = originalEnv;
                    stubFetchWithError.after();
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
                    stubFetchWithError.before();
                },
                after: () => {
                    process.env.NEXT_PUBLIC_REMOVE_ADVERTS = originalEnv;
                    pathname = "/";
                    stubFetchWithError.after();
                },
            },
            props: {
                gpu: false,
                instanceGroup: "generic" as InstanceGroupType,
                marketingData: genericMockMarketingData,
            },
            test: (component) => {
                expect(component.container.innerHTML).toContain("Hello");
            },
        },
    ],
    Advert,
);
