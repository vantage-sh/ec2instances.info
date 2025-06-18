import componentTests from "@/utils/testing/componentTests";
import Advert from "./Advert";
import { expect, vi } from "vitest";

const originalEnv = process.env.NEXT_PUBLIC_REMOVE_ADVERTS;

let pathname = "/";

vi.mock("next/navigation", () => ({
    usePathname: () => pathname,
}));

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
            props: {},
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
            props: {},
            test: (component) => {
                expect(component.container.innerHTML).toContain(
                    "Vantage is a FinOps platform your engineering team will actually use.",
                );
            },
        },
        {
            name: "should render azure when NEXT_PUBLIC_REMOVE_ADVERTS is not 1",
            patch: {
                before: () => {
                    process.env.NEXT_PUBLIC_REMOVE_ADVERTS = "0";
                    pathname = "/azure/vm";
                },
                after: () => {
                    process.env.NEXT_PUBLIC_REMOVE_ADVERTS = originalEnv;
                    pathname = "/";
                },
            },
            props: {},
            test: (component) => {
                expect(component.container.innerHTML).not.toBe("");
                expect(component.container.innerHTML).toContain(
                    "Trying to save on Azure?",
                );
            },
        },
    ],
    Advert,
);
