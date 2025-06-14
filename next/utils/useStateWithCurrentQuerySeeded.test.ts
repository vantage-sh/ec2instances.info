import { expect, test } from "vitest";
import { renderHook } from "@testing-library/react";
import { JSDOM } from "jsdom";
import useStateWithCurrentQuerySeeded from "./useStateWithCurrentQuerySeeded";

const dom = new JSDOM();

function mockLocationSearch(name: string, search: string, testFn: () => void) {
    test(name, () => {
        const originalWindow = global.window;
        const originalDocument = global.document;
        global.window = {
            location: {
                search,
            } as unknown as Location,
        } as unknown as Window & typeof globalThis;
        global.document = dom.window.document;

        try {
            testFn();
        } finally {
            global.window = originalWindow;
            global.document = originalDocument;
        }
    });
}

mockLocationSearch("empty", "", () => {
    const { result } = renderHook(() => useStateWithCurrentQuerySeeded());
    const [value, setValue] = result.current;
    expect(value).toBe("");
    setValue("?a=b");
    expect(window.location.search).toBe("");
});

mockLocationSearch("seeded with value", "?a=b", () => {
    const { result } = renderHook(() => useStateWithCurrentQuerySeeded());
    const [value, setValue] = result.current;
    expect(value).toBe("?a=b");
    setValue("?a=c");
    expect(window.location.search).toBe("?a=b");
});
