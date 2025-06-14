import { expect } from "vitest";
import { RenderResult } from "@testing-library/react";
import componentTests from "@/utils/testing/componentTests";
import InstanceVariants from "./InstanceVariants";

type InstanceVariantsProps = {
    bestOfVariants: { [key: string]: string };
    pathPrefix: string;
    pathSuffix: string;
};

type TestItem = {
    name: string;
    props: InstanceVariantsProps;
    test: (component: RenderResult) => void;
};

componentTests<TestItem>(
    [
        {
            name: "renders instance variants with sorted keys",
            props: {
                bestOfVariants: {
                    c: "c-variant",
                    a: "a-variant",
                    b: "b-variant",
                },
                pathPrefix: "/prefix",
                pathSuffix: "/suffix",
            },
            test: (component: RenderResult) => {
                const links = component.container.querySelectorAll("a");
                expect(links).toHaveLength(3);
                expect(links[0].textContent).toBe("a");
                expect(links[1].textContent).toBe("b");
                expect(links[2].textContent).toBe("c");
            },
        },
        {
            name: "generates correct links with path prefix and suffix",
            props: {
                bestOfVariants: {
                    test: "test-variant",
                },
                pathPrefix: "/prefix",
                pathSuffix: "/suffix",
            },
            test: (component: RenderResult) => {
                const link = component.container.querySelector("a");
                expect(link?.getAttribute("href")).toBe(
                    "/prefix/test-variant/suffix",
                );
            },
        },
        {
            name: "renders empty table when no variants",
            props: {
                bestOfVariants: {},
                pathPrefix: "/prefix",
                pathSuffix: "/suffix",
            },
            test: (component: RenderResult) => {
                const links = component.container.querySelectorAll("a");
                expect(links).toHaveLength(0);
            },
        },
    ],
    InstanceVariants,
);
