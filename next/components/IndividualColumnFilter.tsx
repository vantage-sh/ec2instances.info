import GSettings from "@/utils/g_settings_port";
import { Column } from "@tanstack/react-table";
import { useEffect, useCallback, useState, useId } from "react";
import { FunctionSquare } from "lucide-react";

const GTE_EXPR = /^[ \t\n]*>=[ \t\n]*([\d.]+)[ \t\n]*$/;

function isGteExpr(expr: string): number | null {
    const match = expr.match(GTE_EXPR);
    if (!match) return null;

    let num = match[1];
    if (num.startsWith(".")) {
        num = "0" + num;
    } else if (num.endsWith(".")) {
        num = num + "0";
    }

    const v = parseFloat(num);
    if (isNaN(v)) return null;
    return v;
}

function GSettingsExprFilter<Instance>({
    gSettingsSet,
    gSettingsFullMutations,
    column,
    initValue,
}: {
    gSettingsSet: (value: string) => void;
    gSettingsFullMutations: number;
    column: Column<Instance>;
    initValue: string;
}) {
    const [value, setValue] = useState(initValue);
    const [exprMode, setExprMode] = useState(() => {
        const v = isGteExpr(initValue);
        return v === null;
    });
    const [numberValue, setNumberValue] = useState(() => {
        const v = isGteExpr(initValue);
        if (v !== null) return v;
        return 0;
    });
    const id = useId();

    useEffect(() => {
        // Handle if we launched the page with a value or it reset.
        setValue(initValue);
        const v = isGteExpr(initValue);
        setNumberValue(v ?? 0);
        if (v === null) setExprMode(true);
    }, [initValue]);

    const exprStringChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const v = e.target.value;
            setValue(v);
            gSettingsSet(v);
            column.setFilterValue(v);
            setNumberValue(isGteExpr(v) ?? 0);
        },
        [gSettingsFullMutations],
    );

    const numberChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const v = e.target.valueAsNumber;
            if (isNaN(v)) return;
            setValue(`>=${v}`);
            gSettingsSet(`>=${v}`);
            column.setFilterValue(`>=${v}`);
            setNumberValue(v);
        },
        [gSettingsFullMutations],
    );

    return (
        <div className="flex gap-1 w-full">
            <div className="flex-col my-auto">
                <button
                    aria-selected={exprMode}
                    onClick={() => setExprMode(!exprMode)}
                    aria-label="Toggle expression mode"
                    aria-controls={id}
                    title="Toggle expression mode"
                    className="text-black [&[aria-selected=true]]:text-purple-500 cursor-pointer mt-1"
                >
                    <FunctionSquare size={20} />
                </button>
            </div>

            <div className="flex-col grow">
                {exprMode ? (
                    <input
                        type="text"
                        value={value}
                        onChange={exprStringChange}
                        placeholder={`Filter ${column.columnDef.header as string}...`}
                        id={id}
                        className="w-full px-2 py-1 text-sm border border-gray-5 bg-white font-normal rounded"
                    />
                ) : (
                    <input
                        type="number"
                        value={numberValue}
                        onChange={numberChange}
                        placeholder={`Filter ${column.columnDef.header as string}...`}
                        className="w-full px-2 py-1 text-sm border border-gray-5 bg-white font-normal rounded"
                        min={0}
                        id={id}
                        onKeyDown={(e) => {
                            // number inputs can be unintuitive when deleting the last digit. This helps with that.
                            if (e.key === "Backspace" && numberValue < 10) {
                                e.preventDefault();
                                e.stopPropagation();
                                (e.target as HTMLInputElement).select();
                            }
                        }}
                    />
                )}
            </div>
        </div>
    );
}

type OnlyAllowedGSettingsKeys = {
    [K in keyof GSettings]: K extends `${string}Expr` ? K : never;
}[keyof GSettings];

const columnMapping: Record<string, OnlyAllowedGSettingsKeys | null> = {
    memory: "memoryExpr",
    vCPU: "vcpuExpr",
    vcpu: "vcpuExpr",
    vcpus: "vcpuExpr",
    memory_per_vcpu: "memoryPerVcpuExpr",
    GPU: "gpusExpr",
    GPU_memory: "gpuMemoryExpr",
    maxips: "maxipsExpr",
    storage: "storageExpr",
    size: "storageExpr",
    ecu: null,
    ECU: null,
    io: null,
};

export default function IndividualColumnFilter<Instance>({
    gSettings,
    gSettingsFullMutations,
    column,
}: {
    gSettings: GSettings | undefined;
    gSettingsFullMutations: number;
    column: Column<Instance>;
}) {
    const set = useCallback(
        (value: string) => {
            const key = columnMapping[column.columnDef.id!];
            if (key && gSettings) {
                gSettings[key] = value;
            }
        },
        [column.columnDef.id, gSettingsFullMutations],
    );

    const key = columnMapping[column.columnDef.id!];
    if (key && gSettings) {
        const value = gSettings[key];
        return (
            <GSettingsExprFilter
                gSettingsFullMutations={gSettingsFullMutations}
                gSettingsSet={set}
                column={column}
                initValue={value}
            />
        );
    } else if (key === null) {
        return (
            <GSettingsExprFilter
                gSettingsFullMutations={0}
                gSettingsSet={() => {}}
                column={column}
                initValue={">=0"}
            />
        );
    }

    return (
        <input
            type="text"
            value={(column.getFilterValue() as string) ?? ""}
            onChange={(e) => column.setFilterValue(e.target.value)}
            placeholder={`Filter ${column.columnDef.header as string}...`}
            className="w-full px-2 py-1 text-sm border border-gray-5 bg-white font-normal rounded"
        />
    );
}
