import React from "react";
import MarketingWrapper from "./MarketingWrapper";
import componentTests from "@/utils/testing/componentTests";
import { expect } from "vitest";
import { RenderResult } from "@testing-library/react";

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

componentTests(
    [
        // Marketing disabled

        {
            name: "renders just child if marketing is disabled in aws mode",
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
                azure: false,
                children: testP,
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
                azure: true,
                children: testP,
            },
            test: (component) => {
                expect(component.container.innerHTML).toBe(
                    "<p>testing 123</p>",
                );
            },
        },

        // Marketing enabled

        {
            name: "renders child and marketing in aws mode",
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
                azure: false,
                children: testP,
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
                azure: true,
                children: testP,
            },
            test: validateMarketing,
        },
    ],
    MarketingWrapper,
);
