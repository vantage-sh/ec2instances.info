export default function urlInject(strings: TemplateStringsArray, ...paths: string[]) {
    const e = process.env.NEXT_PUBLIC_URL;
    if (!e) {
        throw new Error("NEXT_PUBLIC_URL is not set");
    }
    const url = new URL(e);

    // Return the string with the URL's injected
    const chunks = [strings[0]];
    for (let i = 0; i < paths.length; i++) {
        url.pathname = paths[i];
        chunks.push(url.toString(), strings[i + 1]);
    }
    const s = chunks.join("");
    return s;
}
