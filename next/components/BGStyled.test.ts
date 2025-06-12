import componentTests from "@/utils/testing/componentTests";
import BGStyled from "./BGStyled";
import { expect } from "vitest";

componentTests(
    [
        {
            name: "true as string",
            props: {
                content: "true",
            },
            test: (r) => {
                expect(r.container.textContent).toBe("true");
            },
        },
        {
            name: "false as string",
            props: {
                content: "false",
            },
            test: (r) => {
                expect(r.container.textContent).toBe("false");
            },
        },
        {
            name: "true as boolean",
            props: {
                content: true,
            },
            test: (r) => {
                expect(r.container.textContent).toBe("true");
                expect(r.container.children.length).toBe(1);
                expect(r.container.children[0].className).toContain(
                    "bg-green-100",
                );
            },
        },
        {
            name: "false as boolean",
            props: {
                content: false,
            },
            test: (r) => {
                expect(r.container.textContent).toBe("false");
                expect(r.container.children.length).toBe(1);
                expect(r.container.children[0].className).toContain(
                    "bg-red-100",
                );
            },
        },
        {
            name: "current as string",
            props: {
                content: "current",
            },
            test: (r) => {
                expect(r.container.textContent).toBe("current");
                expect(r.container.children.length).toBe(1);
                expect(r.container.children[0].className).toContain(
                    "bg-purple-100",
                );
            },
        },
        {
            name: "zero",
            props: {
                content: 0,
            },
            test: (r) => {
                expect(r.container.textContent).toBe("0");
                expect(r.container.children.length).toBe(1);
                expect(r.container.children[0].className).toContain(
                    "bg-red-100",
                );
            },
        },
    ],
    BGStyled,
);
