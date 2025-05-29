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

const MAX_ROW_COL = 2;
const ROW_HEIGHT = 100;
const TOP_START = 250;
const LEFT_START = 120;

const fontfile = path.join(
    __dirname,
    "fonts",
    "Inter-VariableFont_slnt,wght.ttf",
);

function valuesToComposite(values: Value[]): Sharp.OverlayOptions[] {
    let top = TOP_START + 210;
    let left = LEFT_START;
    let currentRowCol = 0;

    let firstColMaxWidth = 0;
    values.forEach((value, index) => {
        if (index % MAX_ROW_COL === 0) {
            const titleWidth = (value.name.length + 1) * 15;
            const valueWidth = value.value.length * 13;
            const maxWidth = Math.max(titleWidth, valueWidth) + 180;
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

            const titleWidth = (value.name.length + 1) * 15;
            const valueWidth = value.value.length * 13;

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
                            height: 22,
                            width: 10000,
                            rgba: true,
                        },
                    },
                    top: top + 40,
                    left: left + 170,
                },
                {
                    input: {
                        text: {
                            fontfile,
                            text: `<span foreground="#ffffff">${sanitize(value.value)}</span>`,
                            height: 22,
                            width: 10000,
                            rgba: true,
                        },
                    },
                    top: top + 75,
                    left: left + 170,
                },
            ] satisfies Sharp.OverlayOptions[];
            left += firstColMaxWidth + 50;
            return v;
        })
        .flat();
}

export default async function makeImage(
    title: string,
    categoryHeader: string,
    values: Value[],
    filename: string,
) {
    const sharp = await getOpengraphBase();

    sharp.composite([
        {
            input: {
                text: {
                    fontfile,
                    text: `<span foreground="#ffffff">${sanitize(title)}</span>`,
                    height: 70,
                    width: 10000,
                    rgba: true,
                },
            },
            top: TOP_START,
            left: LEFT_START,
        },
        {
            input: {
                text: {
                    fontfile,
                    text: `<span foreground="#ffffff">${sanitize(categoryHeader)}</span>`,
                    height: 30,
                    width: 10000,
                    rgba: true,
                },
            },
            top: TOP_START + 110,
            left: LEFT_START,
        },
        ...valuesToComposite(values),
    ]);

    await sharp.png().toFile(filename);
}
