import componentTests from "@/utils/testing/componentTests";
import VantageDemo from "./VantageDemo";
import { expect } from "vitest";

componentTests(
    [
        {
            name: "default configuration",
            props: {
                link: "https://test.example.com",
            },
            test: (r) => {
                expect(r.container.children.length).toBe(1);
                const a = r.container.querySelector("a");
                if (!a) {
                    throw new Error("No anchor found");
                }
                expect(a.href).toBe("https://test.example.com/");
                expect(a.children.length).toBe(1);
                const img = a.children[0] as HTMLImageElement;
                expect(img.src).toBe("http://localhost:3000/demo.png");
            },
        },
    ],
    VantageDemo,
);
