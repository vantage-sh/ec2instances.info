// Imported for side effects
import "@/app/globals.css";

import { describe, expect, test } from "vitest";
import { render, RenderResult } from "@testing-library/react";
import React from "react";
import axe from "axe-core";

type TestItem<Props extends Record<string, unknown>> = {
    name: string;
    props: Props;
    skipAxe?: boolean;
    patch?: {
        before?: () => void;
        after?: () => void;
    };
    test?: (
        component: RenderResult,
        testUtils: {
            rerunAxe: () => Promise<void>;
            rerender: () => void;
        },
    ) => void | Promise<void>;
};

export default function componentTests<Test extends TestItem<any>>(
    tests: Test[],
    component: React.ComponentType<Test["props"]>,
) {
    for (const t of tests) {
        describe(t.name, () => {
            if (t.skipAxe !== true) {
                test("passes axe accessibility checks", async () => {
                    const originalReact = window.React;
                    window.React = React;

                    const originalUrl = new URL(window.location.href);

                    t.patch?.before?.();

                    try {
                        const res = render(
                            React.createElement(component, t.props),
                        );
                        const results = await axe.run(res.container);
                        expect(results.violations).toEqual([]);
                        res.unmount();
                    } finally {
                        window.React = originalReact;
                        window.history.replaceState(
                            {},
                            "",
                            originalUrl.toString(),
                        );
                        t.patch?.after?.();
                    }
                });
            }

            const testFn = t.test;
            if (testFn) {
                test("function called successfully", async () => {
                    const originalReact = window.React;
                    window.React = React;

                    const originalUrl = new URL(window.location.href);

                    t.patch?.before?.();
                    const el = React.createElement(component, t.props);

                    try {
                        const res = render(el);
                        await testFn(res, {
                            rerunAxe: async () => {
                                const results = await axe.run(res.container);
                                expect(results.violations).toEqual([]);
                            },
                            rerender: () => {
                                res.rerender(el);
                            },
                        });
                        res.unmount();
                    } finally {
                        window.React = originalReact;
                        window.history.replaceState(
                            {},
                            "",
                            originalUrl.toString(),
                        );
                        t.patch?.after?.();
                    }
                });
            }
        });
    }
}
