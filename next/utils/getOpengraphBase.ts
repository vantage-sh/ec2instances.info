import sharp from "sharp";

const vantageOgNote = `
NOTE: OpenGraph image generation is currently using a Vantage background,
owned by Vantage. It is not MIT licensed! It is totally fine to use this in development, but if you
aren't Vantage and deploying to production, please set OPENGRAPH_URL to something else. Ideally, make
this image 1911x1156.
`;

const baseRes = (() => {
    let e = process.env.OPENGRAPH_URL;
    if (!e) {
        e = "https://instances.vantage.sh/opengraph_bg.jpg";
        console.log(vantageOgNote);
    }
    return fetch(e).then((r) => {
        if (!r.ok) throw new Error(`Image returned response ${r.status}`);
        return r.arrayBuffer();
    });
})();

export default async () => {
    const base = await baseRes;
    const s = sharp(base);
    return s.resize(1911, 1156, {
        fit: "fill",
    });
};
