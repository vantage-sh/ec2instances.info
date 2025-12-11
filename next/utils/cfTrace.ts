let result: Promise<{
    [key: string]: string;
} | null> | null = null;

async function runTrace(): Promise<{
    [key: string]: string;
} | null> {
    let res: Response;
    try {
        res = await fetch("/cdn-cgi/trace");
        if (!res.ok) {
            return null;
        }
    } catch {
        return null;
    }
    const text = await res.text();
    const lines = text.split("\n");
    const info: { [key: string]: string } = {};
    for (const line of lines) {
        const [key, value] = line.split("=");
        if (key && value) {
            info[key] = value;
        }
    }
    console.log("CF Trace info:", info);
    return info;
}

export default async () => {
    if (result) return result;
    result = runTrace();
    return result;
};
