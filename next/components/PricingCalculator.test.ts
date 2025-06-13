import { fireEvent, RenderResult } from "@testing-library/react";
import { expect } from "vitest";
import componentTests from "@/utils/testing/componentTests";
import PricingCalculator from "./PricingCalculator";
import makeRainbowTable from "@/utils/makeRainbowTable";

const mockPricing = {
    "us-east-1": {
        linux: {
            ondemand: "0.1",
            spot_avg: "0.05",
            spot_min: "0.03",
            reserved: {
                "yrTerm1Standard.noUpfront": "0.08",
                "yrTerm3Standard.noUpfront": "0.06",
            },
        },
        windows: {
            ondemand: "0.2",
            spot_avg: "0.1",
            spot_min: "0.08",
            reserved: {
                "yrTerm1Standard.noUpfront": "0.16",
                "yrTerm3Standard.noUpfront": "0.12",
            },
        },
    },
    "us-west-1": {
        linux: {
            ondemand: "0.3",
            spot_avg: "0.05",
            spot_min: "0.03",
        },
    },
};

const mockRegions = {
    main: {
        "us-east-1": "US East (N. Virginia)",
    },
    local_zone: {
        "us-west-1": "US West (N. California)",
    },
    wavelength: {},
};

const mockOsOptions: [string, string][] = [
    ["linux", "Linux"],
    ["windows", "Windows"],
];

const mockReservedTermOptions: [string, string][] = [
    ["Standard.noUpfront", "No Upfront"],
    ["Standard.partialUpfront", "Partial Upfront"],
    ["Standard.allUpfront", "All Upfront"],
];

const defaultProps = {
    rainbowTable: [],
    compressedInstance: { pricing: mockPricing },
    regions: mockRegions,
    osOptions: mockOsOptions,
    defaultOs: "linux",
    storeOsNameRatherThanId: false,
    reservedTermOptions: mockReservedTermOptions,
    removeSpot: false,
    defaultRegion: "us-east-1",
    useSpotMin: false,
    setPathSuffix: () => {},
};

const [rainbowTable, compressedInstance] = makeRainbowTable([
    { pricing: mockPricing },
]);

const tests = [
    {
        name: "decompresses on render",
        props: {
            ...defaultProps,
            compressedInstance: compressedInstance as any,
            rainbowTable: rainbowTable as string[],
        },
    },
    {
        name: "renders basic pricing information",
        props: defaultProps,
        test: (component: RenderResult) => {
            const prices = component.container.querySelectorAll("p");
            expect(prices[0].textContent).toBe("$0.1");
            expect(prices[1].textContent).toBe("On Demand");
            expect(prices[2].textContent).toBe("$0.05");
            expect(prices[3].textContent).toBe("Spot");
        },
    },
    {
        name: "renders with spot prices removed",
        props: {
            ...defaultProps,
            removeSpot: true,
        },
        test: (component: RenderResult) => {
            const prices = component.container.querySelectorAll("p");
            expect(prices[0].textContent).toBe("$0.1");
            expect(prices[1].textContent).toBe("On Demand");
            expect(prices[2].textContent).toBe("$0.08");
            expect(prices[3].textContent).toBe("1-Year Reserved");
        },
    },
    {
        name: "renders with spot minimum prices",
        props: {
            ...defaultProps,
            useSpotMin: true,
        },
        test: (component: RenderResult) => {
            const prices = component.container.querySelectorAll("p");
            expect(prices[0].textContent).toBe("$0.1");
            expect(prices[1].textContent).toBe("On Demand");
            expect(prices[2].textContent).toBe("$0.03");
            expect(prices[3].textContent).toBe("Spot");
        },
    },
    {
        name: "renders with different OS options",
        props: {
            ...defaultProps,
            defaultOs: "windows",
        },
        test: (component: RenderResult) => {
            const prices = component.container.querySelectorAll("p");
            expect(prices[0].textContent).toBe("$0.2");
            expect(prices[1].textContent).toBe("On Demand");
            expect(prices[2].textContent).toBe("$0.1");
            expect(prices[3].textContent).toBe("Spot");
        },
    },
    {
        name: "renders with different duration",
        props: defaultProps,
        patch: {
            before: () => {
                const url = new URL(window.location.href);
                url.searchParams.set("duration", "monthly");
                window.history.replaceState({}, "", url.toString());
            },
        },
        test: (component: RenderResult) => {
            const prices = component.container.querySelectorAll("p");
            expect(prices[0].textContent).toBe("$73");
            expect(prices[1].textContent).toBe("On Demand");
            expect(prices[2].textContent).toBe("$36.5");
            expect(prices[3].textContent).toBe("Spot");
        },
    },
    {
        name: "renders with different region",
        props: defaultProps,
        patch: {
            before: () => {
                const url = new URL(window.location.href);
                url.searchParams.set("region", "us-west-1");
                window.history.replaceState({}, "", url.toString());
            },
        },
        test: (component: RenderResult) => {
            const prices = component.container.querySelectorAll("p");
            expect(prices[0].textContent).toBe("$219");
            expect(prices[1].textContent).toBe("On Demand");
            expect(prices[2].textContent).toBe("$36.5");
            expect(prices[3].textContent).toBe("Spot");
        },
    },
    {
        name: "hides different OS options when only one is available",
        props: {
            ...defaultProps,
            compressedInstance: {
                pricing: {
                    "us-east-1": {
                        value: {
                            ondemand: "0.1",
                        },
                    },
                },
            },
        },
        test: (component: RenderResult) => {
            const selects = component.container.querySelectorAll("select");
            expect(selects.length).toBe(3);
        },
    },
];

componentTests(tests, PricingCalculator);
