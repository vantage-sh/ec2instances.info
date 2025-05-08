class Raw {
    readonly s: string;

    constructor(s: string) {
        this.s = s;
    }
}

export function raw(s: string) {
    return new Raw(s);
}

export function urlInject(
    strings: TemplateStringsArray,
    ...paths: (string | Raw)[]
) {
    const e = process.env.NEXT_PUBLIC_URL;
    if (!e) {
        throw new Error("NEXT_PUBLIC_URL is not set");
    }
    const url = new URL(e);

    // Return the string with the URL's injected
    const chunks = [strings[0]];
    for (let i = 0; i < paths.length; i++) {
        const p = paths[i];
        if (p instanceof Raw) {
            chunks.push(p.s, strings[i + 1]);
        } else {
            url.pathname = p;
            chunks.push(url.toString(), strings[i + 1]);
        }
    }
    const s = chunks.join("");
    return s;
}
