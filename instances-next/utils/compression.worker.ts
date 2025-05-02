import { XzReadableStream } from "xz-decompress";

onmessage = async (e) => {
    const { url }: { url: string } = e.data;

    const res = await fetch(url);
    if (!res.ok) {
        throw new Error(`Failed to fetch compressed file: ${url}`);
    }

    const s = new XzReadableStream(res.body!);
    const reader = s.getReader();
    for (;;) {
        const { done, value } = await reader.read();
        if (done) {
            postMessage(null);
            break;
        }
        postMessage(value);
    }
}
