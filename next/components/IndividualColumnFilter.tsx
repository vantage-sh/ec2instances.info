import { Column } from "@tanstack/react-table";
import { useEffect, useState, useId, useMemo, useRef } from "react";
import { SquareFunction, X } from "lucide-react";
import expr from "@/utils/expr";

function ExprHelpData({ parseError }: { parseError: string | null }) {
    return (
        <div className="font-normal text-sm">
            {parseError && (
                <div className="text-red-500 font-bold border border-red-500 rounded-md p-2 mb-4">
                    {parseError}
                </div>
            )}
            <p>
                Expressions are used to filter the table. You can use the
                following syntax:
            </p>
            <ul className="list-disc pl-4 mt-2 space-y-1">
                <li>
                    Numbers: <code>42</code>, <code>3.14</code>
                </li>
                <li>
                    Comparisons: <code>&gt;10</code>, <code>&gt;=20</code>,{" "}
                    <code>&lt;30</code>, <code>&lt;=40</code>
                </li>
                <li>
                    Ranges: <code>10..20</code> (inclusive range)
                </li>
                <li>
                    Logical operators: <code>&amp;&amp;</code> (AND),{" "}
                    <code>||</code> (OR), <code>!</code> (NOT)
                </li>
                <li>
                    Grouping: <code>(expression)</code>
                </li>
                <li>
                    String methods:
                    <ul className="list-disc pl-4 mt-1 space-y-1">
                        <li>
                            <code>starts_with("text")</code> - Checks if value
                            starts with text
                        </li>
                        <li>
                            <code>ends_with("text")</code> - Checks if value
                            ends with text
                        </li>
                        <li>
                            <code>has("text")</code> - Checks if value contains
                            text
                        </li>
                    </ul>
                </li>
                <li>
                    Storage type methods:
                    <ul className="list-disc pl-4 mt-1 space-y-1">
                        <li>
                            <code>ebs</code> - Matches EBS storage
                        </li>
                        <li>
                            <code>nvme</code> - Matches NVMe storage
                        </li>
                        <li>
                            <code>ssd</code> - Matches SSD storage
                        </li>
                        <li>
                            <code>hdd</code> - Matches HDD storage
                        </li>
                    </ul>
                </li>
                <li>
                    Ternary operator:{" "}
                    <code>condition ? trueValue : falseValue</code>
                </li>
            </ul>
            <p className="mt-2">Examples:</p>
            <ul className="list-disc pl-4 mt-1 space-y-1">
                <li>
                    <code>&gt;=4 &amp;&amp; &lt;=8</code> - Values between 4 and
                    8 (inclusive)
                </li>
                <li>
                    <code>2..4 || &gt;=10</code> - Values from 2 to 4, or
                    greater than or equal to 10
                </li>
                <li>
                    <code>!(2..4)</code> - Values not between 2 and 4
                </li>
                <li>
                    <code>&lt;100 ? ssd : hdd</code> - Match SSD if storage &lt;
                    100, otherwise match HDD
                </li>
                <li>
                    <code>nvme</code> - Match NVMe storage
                </li>
            </ul>
        </div>
    );
}

function ExprHelpModal({ parseError }: { parseError: string | null }) {
    const dialogRef = useRef<HTMLDialogElement>(null);

    return (
        <>
            <dialog
                ref={dialogRef}
                className="fixed inset-0 z-50"
                onClick={() => dialogRef.current?.close()}
            >
                <div className="fixed inset-0 bg-opacity-50"></div>
                <div className="fixed inset-0 flex items-center justify-center">
                    <div
                        className="bg-white dark:text-white p-4 mx-4 rounded-lg max-w-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex gap-2">
                            <button
                                onClick={() => dialogRef.current?.close()}
                                className="text-black cursor-pointer"
                                aria-label="Close expression help"
                            >
                                <X size={15} />
                            </button>
                            <h1 className="text-lg font-bold">
                                Expression Help
                            </h1>
                        </div>
                        <hr className="my-4" />
                        <ExprHelpData parseError={parseError} />
                    </div>
                </div>
            </dialog>
            <button
                onClick={() => {
                    dialogRef.current?.showModal();
                }}
                aria-label="Show expression help"
                title="Show expression help"
                className="text-gray-2 cursor-pointer mt-1.5"
            >
                <SquareFunction size={20} />
            </button>
        </>
    );
}

function ExprFilter<Instance>({
    column,
    initValue,
}: {
    column: Column<Instance>;
    initValue: string;
}) {
    const [value, setValue] = useState(initValue);
    const exprParseError = useMemo(() => {
        try {
            expr(value)(0, "");
            return null;
        } catch (e) {
            return e instanceof Error ? e.message : `${e}`;
        }
    }, [value]);

    const id = useId();

    useEffect(() => {
        // Handle if we launched the page with a value or it reset.
        setValue(initValue);
    }, [initValue]);

    const exprStringChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const v = e.target.value;
        setValue(v);
        column.setFilterValue(v);
    };

    return (
        <div className="flex gap-1 w-full">
            <div className="flex-col grow">
                <input
                    type="text"
                    value={value}
                    onChange={exprStringChange}
                    placeholder={`Filter ${column.columnDef.header as string}...`}
                    id={id}
                    className={`w-full px-2 py-1 text-sm border border-gray-3 bg-white font-normal rounded ${
                        exprParseError ? "border-red-500" : ""
                    }`}
                />
            </div>
            <div className="flex-col my-auto">
                <ExprHelpModal parseError={exprParseError} />
            </div>
        </div>
    );
}

const exprColumns = [
    "memory",
    "vCPU",
    "vcpu",
    "vcpus",
    "memory_per_vcpu",
    "GPU",
    "GPU_memory",
    "maxips",
    "storage",
    "size",
    "ecu",
    "ECU",
    "io",
];

export default function IndividualColumnFilter<Instance>({
    column,
}: {
    column: Column<Instance>;
}) {
    if (exprColumns.includes(column.columnDef.id!)) {
        return (
            <ExprFilter
                column={column}
                initValue={
                    (column.getFilterValue() as string | undefined) ?? ">=0"
                }
            />
        );
    }

    return (
        <input
            type="text"
            value={(column.getFilterValue() as string) ?? ""}
            onChange={(e) => column.setFilterValue(e.target.value)}
            placeholder={`Filter ${column.columnDef.header as string}...`}
            className="w-full px-2 py-1 text-sm border border-gray-3 bg-white font-normal rounded"
        />
    );
}
