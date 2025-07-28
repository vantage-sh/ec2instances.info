import { expect } from "vitest";
import componentTests from "@/utils/testing/componentTests";
import PricingCalculator from "./PricingCalculator";
import makeRainbowTable from "@/utils/makeRainbowTable";
import { fireEvent } from "@testing-library/react";

const mockPricing = {
    "us-east-1": {
        linux: {
            ondemand: "0.1",
            spot_avg: "0.05",
            spot_min: "0.03",
            reserved: {
                "yrTerm1Standard.noUpfront": "0.08",
                "yrTerm3Standard.noUpfront": "0.06",
                "yrTerm1Standard.partialUpfront": "0.05",
                "yrTerm3Standard.partialUpfront": "0.04",
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
    china: {},
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
    setPathSuffix: () => {
        throw new Error("setPathSuffix should not be called");
    },
    currencies: [
        {
            code: "USD",
            name: "US Dollar",
            cnyRate: 7.1,
            usdRate: 1,
            currencySymbol: "$",
        },
    ],
};

const [rainbowTable, compressedInstance] = makeRainbowTable([
    { pricing: mockPricing },
]);

let pathSuffix = "";

componentTests(
    [
        // Initial render tests

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
            test: (component) => {
                const prices = component.container.querySelectorAll("p");
                expect(prices[0].textContent).toBe("$0.10");
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
            test: (component) => {
                const prices = component.container.querySelectorAll("p");
                expect(prices[0].textContent).toBe("$0.10");
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
            test: (component) => {
                const prices = component.container.querySelectorAll("p");
                expect(prices[0].textContent).toBe("$0.10");
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
            test: (component) => {
                const prices = component.container.querySelectorAll("p");
                expect(prices[0].textContent).toBe("$0.20");
                expect(prices[1].textContent).toBe("On Demand");
                expect(prices[2].textContent).toBe("$0.10");
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
            test: (component) => {
                const prices = component.container.querySelectorAll("p");
                expect(prices[0].textContent).toBe("$73.00");
                expect(prices[1].textContent).toBe("On Demand");
                expect(prices[2].textContent).toBe("$36.50");
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
            test: (component) => {
                const prices = component.container.querySelectorAll("p");
                expect(prices[0].textContent).toBe("$0.30");
                expect(prices[1].textContent).toBe("On Demand");
                expect(prices[2].textContent).toBe("$0.05");
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
            test: (component) => {
                const selects = component.container.querySelectorAll("select");
                expect(selects.length).toBe(3);
            },
        },
        {
            name: "select's aria-controls is set to the id of the pricing calculator",
            props: defaultProps,
            skipAxe: true,
            test: (component) => {
                const selects = component.container.querySelectorAll(
                    "select[aria-controls]",
                );
                const labels: string[] = [];
                const idSet: Set<string> = new Set();
                for (const select of selects) {
                    labels.push(select.getAttribute("aria-label")!);
                    idSet.add(select.getAttribute("aria-controls")!);
                }
                expect(labels).toEqual([
                    "Region",
                    "Platform",
                    "Duration",
                    "Pricing Type",
                ]);
                expect(idSet.size).toBe(1);
            },
        },

        // Handle changing select values

        {
            name: "region is changed",
            props: {
                ...defaultProps,
                setPathSuffix: (suffix: string) => (pathSuffix = suffix),
            },
            patch: {
                before: () => (pathSuffix = ""),
                after: () => (pathSuffix = ""),
            },
            test: (component) => {
                const region = component.container.querySelector("select")!;
                const onDemandPrice = component.container.querySelector(
                    "p[data-testid='On Demand']",
                )!;
                expect(onDemandPrice.textContent).toBe("$0.10");
                fireEvent.change(region, { target: { value: "us-west-1" } });
                expect(pathSuffix).toBe("?currency=USD&region=us-west-1");
                expect(document.location.search).toBe(
                    "?currency=USD&region=us-west-1",
                );

                expect(onDemandPrice.textContent).toBe("$0.30");
            },
        },
        {
            name: "platform is changed",
            props: {
                ...defaultProps,
                setPathSuffix: (suffix: string) => (pathSuffix = suffix),
            },
            patch: {
                before: () => (pathSuffix = ""),
                after: () => (pathSuffix = ""),
            },
            test: (component) => {
                const platform = component.container.querySelector(
                    "select:nth-child(2)",
                )!;
                const onDemandPrice = component.container.querySelector(
                    "p[data-testid='On Demand']",
                )!;
                expect(onDemandPrice.textContent).toBe("$0.10");
                fireEvent.change(platform, { target: { value: "windows" } });
                expect(pathSuffix).toBe("?currency=USD&platform=windows");
                expect(document.location.search).toBe(
                    "?currency=USD&platform=windows",
                );
                expect(onDemandPrice.textContent).toBe("$0.20");
            },
        },
        {
            name: "duration is changed",
            props: {
                ...defaultProps,
                setPathSuffix: (suffix: string) => (pathSuffix = suffix),
            },
            patch: {
                before: () => (pathSuffix = ""),
                after: () => (pathSuffix = ""),
            },
            test: (component) => {
                const duration = component.container.querySelector(
                    "select:nth-child(3)",
                )!;
                const onDemandPrice = component.container.querySelector(
                    "p[data-testid='On Demand']",
                )!;
                expect(onDemandPrice.textContent).toBe("$0.10");
                fireEvent.change(duration, { target: { value: "monthly" } });
                expect(pathSuffix).toBe("?currency=USD&duration=monthly");
                expect(document.location.search).toBe(
                    "?currency=USD&duration=monthly",
                );
                expect(onDemandPrice.textContent).toBe("$73.00");
            },
        },
        {
            name: "reserved term is changed",
            props: {
                ...defaultProps,
                setPathSuffix: (suffix: string) => (pathSuffix = suffix),
            },
            patch: {
                before: () => (pathSuffix = ""),
                after: () => (pathSuffix = ""),
            },
            test: (component) => {
                const reservedTerm = component.container.querySelector(
                    "select:nth-child(4)",
                )!;
                const oneYearReservedPrice = component.container.querySelector(
                    "p[data-testid='1-Year Reserved']",
                )!;
                const threeYearReservedPrice =
                    component.container.querySelector(
                        "p[data-testid='3-Year Reserved']",
                    )!;
                expect(oneYearReservedPrice.textContent).toBe("$0.08");
                expect(threeYearReservedPrice.textContent).toBe("$0.06");
                fireEvent.change(reservedTerm, {
                    target: { value: "Standard.partialUpfront" },
                });
                expect(pathSuffix).toBe(
                    "?currency=USD&pricingType=Standard.partialUpfront",
                );
                expect(document.location.search).toBe(
                    "?currency=USD&pricingType=Standard.partialUpfront",
                );
                expect(oneYearReservedPrice.textContent).toBe("$0.05");
                expect(threeYearReservedPrice.textContent).toBe("$0.04");
            },
        },
    ],
    PricingCalculator,
);
