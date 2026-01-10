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
            <div className="py-0.5 px-1 w-max font-mono text-sm rounded-md bg-purple-100 border border-purple-300 dark:bg-purple-900 dark:border-purple-700">
                current
            </div>
        );
    }

    const j = typeof content === "string" ? content : JSON.stringify(content);
    const danger = RED.includes(j.toLowerCase());

    if (content === undefined) return undefined;

    if (content === "previous") {
        return (
            <div className="py-0.5 px-1 w-max font-mono text-sm rounded-md bg-gray-100 border border-gray-300 dark:bg-gray-900 dark:border-gray-700">
                previous
            </div>
        );
    }

    return (
        <div
            className={`py-0.5 px-1 w-max text-xs font-mono rounded -my-0.5 ${danger ? "bg-red-100 border border-red-300 dark:bg-red-900 dark:border-red-700" : "bg-green-100 border border-green-300 dark:bg-green-900 dark:border-green-700"}`}
        >
            {j}
        </div>
    );
}
