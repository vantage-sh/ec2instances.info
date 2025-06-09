import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        environment: "node",
        include: [
            "app/**/*.test.ts?(x)",
            "components/**/*.test.ts?(x)",
            "utils/**/*.test.ts?(x)",
        ],
        exclude: ["public", "out", ".next"],
        coverage: {
            provider: "v8",
            exclude: ["public", "out", ".next", "utils/testing"],
        },
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./"),
        },
    },
});
