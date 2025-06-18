import sharp, { Sharp } from "sharp";
import makeImage from "./makeImage";

export type InstanceOverlay = {
    name: string;
    categoryHeader: string;
    filename: string;
    url: string;
    values: {
        name: string;
        value: string;
        squareIconPath: string;
    }[];
};

let base: Sharp;

process.on("message", async (message: [InstanceOverlay, number]) => {
    const [overlay, reqId] = message;
    if (reqId === -1) {
        // @ts-expect-error: special init case where this is different
        const buf = overlay as Buffer;

        // I'm not actually sure why I need to call Buffer.from here, but sharp
        // would throw some very bizare errors if I didn't.
        base = sharp(Buffer.from(buf));
        return;
    }
    makeImage(
        base.clone(),
        overlay.name,
        overlay.categoryHeader,
        overlay.url,
        overlay.values,
        overlay.filename,
    )
        .then(() => {
            process.send?.(reqId);
        })
        .catch((e) => {
            console.error(e);
            process.exit(1);
        });
});
