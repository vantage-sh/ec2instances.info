import { expect, test } from "vitest";
import { urlInject, raw } from "./urlInject";

const scenario = () => urlInject`${"/test"} testing ${raw("/pos")}`;

test("throws if NEXT_PUBLIC_URL is not set", () => {
    const originalNextPublicUrl = process.env.NEXT_PUBLIC_URL;
    delete process.env.NEXT_PUBLIC_URL;
    expect(scenario).toThrow("NEXT_PUBLIC_URL is not set");
    process.env.NEXT_PUBLIC_URL = originalNextPublicUrl;
});

test("does not throw if NEXT_PUBLIC_URL is set", () => {
    const originalNextPublicUrl = process.env.NEXT_PUBLIC_URL;
    process.env.NEXT_PUBLIC_URL = "https://theonion.com";
    expect(scenario()).toEqual("https://theonion.com/test testing /pos");
    process.env.NEXT_PUBLIC_URL = originalNextPublicUrl;
});
