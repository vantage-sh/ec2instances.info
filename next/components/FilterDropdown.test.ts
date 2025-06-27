import componentTests from "@/utils/testing/componentTests";
import FilterDropdown from "./FilterDropdown";
import { expect } from "vitest";
import { fireEvent } from "@testing-library/react";

const originalResizeObserver = window.ResizeObserver;
const originalScrollIntoView = Element.prototype.scrollIntoView;

const patchResizeObserver = {
    before: () => {
        window.ResizeObserver = class {
            observe() {
                return {
                    disconnect: () => {},
                    observe: () => {},
                    unobserve: () => {},
                };
            }
            disconnect() {}
            unobserve() {}
        };
        Element.prototype.scrollIntoView = function () {};
    },
    after: () => {
        window.ResizeObserver = originalResizeObserver;
        Element.prototype.scrollIntoView = originalScrollIntoView;
    },
};

componentTests(
    [
        // Initial render tests

        {
            name: "renders without search",
            patch: patchResizeObserver,
            props: {
                label: "Test",
                value: "test",
                onChange: () => {},
                options: [
                    {
                        value: "test",
                        label: "Test",
                    },
                    {
                        value: "test2",
                        label: "Test 2",
                    },
                ],
                hideSearch: true,
            },
            test: async (component, { rerunAxe }) => {
                const button = component.getByRole("combobox");
                fireEvent.click(button);
                await rerunAxe();
            },
        },
        {
            name: "renders with search",
            patch: patchResizeObserver,
            props: {
                label: "Test",
                value: "test",
                onChange: () => {},
                options: [
                    {
                        value: "test",
                        label: "Test",
                    },
                    {
                        value: "test2",
                        label: "Test 2",
                    },
                ],
                hideSearch: false,
            },
            test: async (component, { rerunAxe }) => {
                const button = component.getByRole("combobox");
                fireEvent.click(button);
                await rerunAxe();
            },
        },
        {
            name: "grouped items",
            patch: patchResizeObserver,
            props: {
                label: "Test",
                value: "test",
                onChange: () => {},
                options: [
                    {
                        value: "test",
                        label: "Test",
                        group: "Group 1",
                    },
                    {
                        value: "test2",
                        label: "Test 2",
                        group: "Group 1",
                    },
                    {
                        value: "test3",
                        label: "Test 3",
                        group: "Group 2",
                    },
                ],
                hideSearch: false,
            },
            test: async (component, { rerunAxe }) => {
                const button = component.getByRole("combobox");
                fireEvent.click(button);
                await rerunAxe();
                expect(component.getByText("Group 1")).toBeTruthy();
                expect(component.getByText("Group 2")).toBeTruthy();
            },
        },

        // Logic tests

        {
            name: "searching works",
            patch: patchResizeObserver,
            props: {
                label: "Test",
                value: "test",
                onChange: () => {},
                options: [
                    {
                        value: "test",
                        label: "Test 1",
                    },
                    {
                        value: "test2",
                        label: "Test 2",
                    },
                ],
                hideSearch: false,
            },
            skipAxe: true,
            test: async (component, { rerunAxe }) => {
                const button = component.getByRole("combobox");
                fireEvent.click(button);
                const input = component.getByRole("textbox");
                fireEvent.change(input, { target: { value: "Test 2" } });
                await rerunAxe();
                const test1 = component.baseElement.querySelector(
                    "div[data-value='test']",
                );
                expect(test1).toBeFalsy();
                const test2 = component.baseElement.querySelector(
                    "div[data-value='test2']",
                );
                expect(test2).toBeTruthy();
            },
        },
    ],
    FilterDropdown,
);
