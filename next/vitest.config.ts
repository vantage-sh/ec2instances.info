import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        projects: [
            {
                extends: true,
                test: {
                    name: "node",
                    environment: "node",
                    include: ["app/**/*.test.ts?(x)", "utils/**/*.test.ts?(x)"],
                },
            },
            {
                extends: true,
                test: {
                    name: "jsdom",
                    environment: "jsdom",
                    include: ["components/**/*.test.ts?(x)"],
                },
            },
        ],
        exclude: ["public", "out", ".next", "cli"],
        coverage: {
            provider: "v8",
            exclude: ["public", "out", ".next", "utils/testing", "cli"],
        },
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./"),
        },
    },
});
