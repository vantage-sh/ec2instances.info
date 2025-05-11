const RED: string[] = [
    "0",
    "n/a",
    "no",
    "none",
    "false",
    "off",
    "unavailable",
    "error",
    "unknown",
    "unsupported",
    "unsupported",
];

export default function BGStyled({ content }: { content: any }) {
    if (typeof content === "string" && content.toLowerCase() === "current") {
        return (
            <div className="py-0.5 px-1 w-max font-mono text-sm rounded-md bg-purple-100 border border-purple-300">
                current
            </div>
        );
    }

    const j = typeof content === "string" ? content : JSON.stringify(content);
    const danger = RED.includes(j.toLowerCase());

    return (
        <div
            className={`py-0.5 px-1 w-max text-xs font-mono rounded -my-0.5 ${danger ? "bg-red-100 border border-red-300" : "bg-green-100 border border-green-300"}`}
        >
            {j}
        </div>
    );
}
