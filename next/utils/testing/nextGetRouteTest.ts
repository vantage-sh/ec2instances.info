import { test } from "vitest";

const mockReq = new Request("http://localhost:3000/");

export default function nextGetRouteTest(
    testName: string,
    getMethod: (req: Request) => Promise<Response>,
    handler: (content: string) => void,
    setEnvVars?: Record<string, string>,
) {
    test(testName, async () => {
        const oldValues: Map<string, string | undefined> = new Map();
        for (const [key, value] of Object.entries(setEnvVars ?? {})) {
            oldValues.set(key, process.env[key]);
            process.env[key] = value;
        }

        const res = await getMethod(mockReq);
        if (!res.ok) {
            throw new Error(`Failed to get route: ${res.status}`);
        }
        const content = await res.text();
        try {
            handler(content);
        } finally {
            for (const [key, value] of oldValues) {
                if (value === undefined) {
                    delete process.env[key];
                } else {
                    process.env[key] = value;
                }
            }
        }
    });
}
