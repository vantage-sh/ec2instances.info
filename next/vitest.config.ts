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
        coverage: {
            provider: "v8",
        },
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./"),
        },
    },
});
