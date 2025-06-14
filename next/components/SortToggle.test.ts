import componentTests from "@/utils/testing/componentTests";
import SortToggle from "./SortToggle";
import { expect } from "vitest";

function findByTitleAndCheckPressed(
    element: HTMLElement,
    title: string,
    pressed: boolean,
) {
    const button = element.querySelector(
        `button[title="${title}"]`,
    ) as HTMLButtonElement;
    if (!button) {
        throw new Error(`Button with title "${title}" not found`);
    }
    expect(button.getAttribute("aria-pressed")).toBe(pressed.toString());
    return button;
}

let writtenValue: boolean | undefined = undefined;

componentTests(
    [
        {
            name: "neither asc or desc is highlighted",
            props: {
                value: undefined,
                setValue: () => {},
            },
            test: (r) => {
                findByTitleAndCheckPressed(
                    r.container,
                    "Sort ascending",
                    false,
                );
                findByTitleAndCheckPressed(
                    r.container,
                    "Sort descending",
                    false,
                );
            },
        },
        {
            name: "asc is highlighted",
            props: {
                value: false,
                setValue: () => {},
            },
            test: (r) => {
                findByTitleAndCheckPressed(r.container, "Sort ascending", true);
                findByTitleAndCheckPressed(
                    r.container,
                    "Sort descending",
                    false,
                );
            },
        },
        {
            name: "desc is highlighted",
            props: {
                value: true,
                setValue: () => {},
            },
            test: (r) => {
                findByTitleAndCheckPressed(
                    r.container,
                    "Sort ascending",
                    false,
                );
                findByTitleAndCheckPressed(
                    r.container,
                    "Sort descending",
                    true,
                );
            },
        },
        {
            name: "asc clicked",
            props: {
                value: undefined,
                setValue: (v: boolean | undefined) => {
                    writtenValue = v;
                },
            },
            test: (r) => {
                const button = findByTitleAndCheckPressed(
                    r.container,
                    "Sort ascending",
                    false,
                );
                button.click();
                expect(writtenValue).toBe(false);
            },
        },
        {
            name: "desc clicked",
            props: {
                value: undefined,
                setValue: (v: boolean | undefined) => {
                    writtenValue = v;
                },
            },
            test: (r) => {
                const button = findByTitleAndCheckPressed(
                    r.container,
                    "Sort descending",
                    false,
                );
                button.click();
                expect(writtenValue).toBe(true);
            },
        },
    ],
    SortToggle,
);
