import makeImage from "./makeImage";

makeImage(
    "t1.micro",
    "EC2 Instances",
    [
        {
            name: "CPU",
            value: "test hello test",
            squareIconPath: "icons/cpu.png",
        },
        {
            name: "CPU",
            value: "test",
            squareIconPath: "icons/cpu.png",
        },
        {
            name: "CPU",
            value: "test2",
            squareIconPath: "icons/cpu.png",
        },
        {
            name: "CPU",
            value: "test3",
            squareIconPath: "icons/cpu.png",
        },
        {
            name: "CPU",
            value: "test4",
            squareIconPath: "icons/cpu.png",
        },
    ],
    "./test.png",
);
