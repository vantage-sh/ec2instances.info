// Imported for side effects
import "@/app/globals.css";

import { describe, expect, test } from "vitest";
import { render, RenderResult } from "@testing-library/react";
import React from "react";
import axe from "axe-core";

type TestItem<Props extends Record<string, unknown>> = {
    name: string;
    props: Props;
    patch?: {
        before?: () => void;
        after?: () => void;
    };
    test?: (component: RenderResult) => void;
};

export default function componentTests<Test extends TestItem<any>>(
    tests: Test[],
    component: React.ComponentType<Test["props"]>,
) {
    for (const t of tests) {
        describe(t.name, () => {
            test("passes axe accessibility checks", async () => {
                const originalReact = window.React;
                window.React = React;

                t.patch?.before?.();

                try {
                    const res = render(React.createElement(component, t.props));
                    const results = await axe.run(res.container);
                    expect(results.violations).toEqual([]);
                    res.unmount();
                } finally {
                    window.React = originalReact;
                    t.patch?.after?.();
                }
            });

            const testFn = t.test;
            if (testFn) {
                test("function called successfully", () => {
                    const originalReact = window.React;
                    window.React = React;

                    t.patch?.before?.();

                    try {
                        const res = render(
                            React.createElement(component, t.props),
                        );
                        testFn(res);
                        res.unmount();
                    } finally {
                        window.React = originalReact;
                        t.patch?.after?.();
                    }
                });
            }
        });
    }
}
