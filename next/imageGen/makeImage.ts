import Sharp, { Sharp as SharpInstance } from "sharp";
import path from "path";

Sharp.cache({ items: 20000 });

type Value = {
    name: string;
    value: string;
    squareIconPath: string;
};

function sanitize(text: string) {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

const MAX_ROW_COL = 2;
const ROW_HEIGHT = 100;
const TOP_START = 230;
const LEFT_START = 120;

const fontfile = path.join(
    __dirname,
    "fonts",
    "Inter-VariableFont_slnt,wght.ttf",
);

function valuesToComposite(values: Value[]): Sharp.OverlayOptions[] {
    let top = TOP_START + 100;
    let left = LEFT_START;
    let currentRowCol = 0;

    let firstColMaxWidth = 0;
    values.forEach((value, index) => {
        if (index % MAX_ROW_COL === 0) {
            const titleWidth = (value.name.length + 1) * 30;
            const valueWidth = value.value.length * 24;
            const maxWidth = Math.max(titleWidth, valueWidth) + 200;
            firstColMaxWidth = Math.max(firstColMaxWidth, maxWidth);
        }
    });

    return values
        .map((value) => {
            if (currentRowCol === MAX_ROW_COL) {
                // Reset the row and column
                currentRowCol = 0;
                top += ROW_HEIGHT + 100;
                left = LEFT_START;
            }
            currentRowCol++;

            const v = [
                {
                    input: path.join(__dirname, value.squareIconPath),
                    top,
                    left,
                },
                {
                    input: {
                        text: {
                            fontfile,
                            text: `<span foreground="#ffffff"><b>${sanitize(value.name)}:</b></span>`,
                            height: 44,
                            width: 10000,
                            rgba: true,
                        },
                    },
                    top: top + 20,
                    left: left + 190,
                },
                {
                    input: {
                        text: {
                            fontfile,
                            text: `<span foreground="#ffffff">${sanitize(value.value)}</span>`,
                            height: 40,
                            width: 10000,
                            rgba: true,
                        },
                    },
                    top: top + 80,
                    left: left + 190,
                },
            ] satisfies Sharp.OverlayOptions[];
            left += firstColMaxWidth + 50;
            return v;
        })
        .flat();
}

export default async function makeImage(
    sharp: SharpInstance,
    title: string,
    categoryHeader: string,
    values: Value[],
    filename: string,
) {
    // Ok, this is very petty of me, but basically the size is mildly different on different titles.
    const titleImage = Sharp({
        text: {
            fontfile,
            text: `<span foreground="#ffffff">${sanitize(title)}</span>`,
            width: 10000,
            wrap: "none",
            rgba: true,
            dpi: 400,
        },
    });

    sharp.composite([
        {
            input: await titleImage.png().toBuffer(),
            top: 152 - Math.floor((await titleImage.metadata()).height / 2),
            left: 440,
        },
        {
            input: {
                text: {
                    fontfile,
                    text: `<span foreground="#ffffff">${sanitize(categoryHeader)}</span>`,
                    height: 40,
                    width: 10000,
                    rgba: true,
                },
            },
            top: TOP_START,
            left: LEFT_START,
        },
        ...valuesToComposite(values),
    ]);

    // Half the image to make it smaller and add anti-aliasing
    const metadata = await sharp.metadata();
    const png = await sharp.png().toBuffer();
    await Sharp(png)
        .resize(
            Math.floor(metadata.width / 2),
            Math.floor(metadata.height / 2),
            {
                kernel: "lanczos3",
            },
        )
        .toFile(filename);
}
