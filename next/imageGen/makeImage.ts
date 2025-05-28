import Sharp from "sharp";
import getOpengraphBase from "./getOpengraphBase";
import path from "path";

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

const MAX_ROW_COL = 3;
const ROW_HEIGHT = 100;

function valuesToComposite(values: Value[]): Sharp.OverlayOptions[] {
    let top = 250;
    let left = 110;
    let currentRowCol = 0;

    return values
        .map((value) => {
            if (currentRowCol === MAX_ROW_COL) {
                // Reset the row and column
                currentRowCol = 0;
                top += ROW_HEIGHT + 40;
                left = 110;
            }
            currentRowCol++;

            const titleWidth = (value.name.length + 1) * 15;
            const valueWidth = value.value.length * 15;
            const maxWidth = Math.max(titleWidth, valueWidth) + 130;

            const v = [
                {
                    input: path.join(__dirname, value.squareIconPath),
                    top,
                    left,
                },
                {
                    input: {
                        text: {
                            fontfile: path.join(
                                __dirname,
                                "fonts",
                                "Inter-VariableFont_slnt,wght.ttf",
                            ),
                            text: `<span foreground="#ffffff"><b>${sanitize(value.name)}:</b></span>`,
                            height: 22,
                            width: 10000,
                            rgba: true,
                        },
                    },
                    top: top + 15,
                    left: left + 130,
                },
                {
                    input: {
                        text: {
                            fontfile: path.join(
                                __dirname,
                                "fonts",
                                "Inter-VariableFont_slnt,wght.ttf",
                            ),
                            text: `<span foreground="#ffffff">${sanitize(value.value)}</span>`,
                            height: 22,
                            width: 10000,
                            rgba: true,
                        },
                    },
                    top: top + 50,
                    left: left + 130,
                },
            ] satisfies Sharp.OverlayOptions[];
            left += maxWidth + 10;
            return v;
        })
        .flat();
}

export default async function makeImage(
    categoryHeader: string,
    title: string,
    values: Value[],
    filename: string,
) {
    const sharp = await getOpengraphBase();

    const leftLogoOffset = 450;
    const topLogoOffset = 120;
    sharp.composite([
        {
            input: {
                text: {
                    fontfile: path.join(
                        __dirname,
                        "fonts",
                        "Inter-VariableFont_slnt,wght.ttf",
                    ),
                    text: `<span foreground="#ffffff">${sanitize(categoryHeader)}</span>`,
                    height: 30,
                    width: 10000,
                    rgba: true,
                },
            },
            top: topLogoOffset,
            left: leftLogoOffset,
        },
        {
            input: {
                text: {
                    fontfile: path.join(
                        __dirname,
                        "fonts",
                        "Inter-VariableFont_slnt,wght.ttf",
                    ),
                    text: `<span foreground="#ffffff">${sanitize(title)}</span>`,
                    height: 22,
                    width: 10000,
                    rgba: true,
                },
            },
            top: topLogoOffset + 50,
            left: leftLogoOffset,
        },
        ...valuesToComposite(values),
    ]);

    await sharp.png().toFile(filename);
}
