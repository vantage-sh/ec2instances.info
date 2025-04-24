import { Instance } from "@/types";
import GSettings from "@/utils/g_settings_port";
import { Column } from "@tanstack/react-table";
import { useEffect, useCallback, useState } from "react";

function GSettingsNumberFilter({
    gSettingsSet,
    gSettingsFullMutations,
    column,
    initValue,
}: {
    gSettingsSet: (value: number) => void;
    gSettingsFullMutations: number;
    column: Column<Instance>;
    initValue: number;
}) {
    const [value, setValue] = useState(initValue);

    useEffect(() => {
        // Handle if it is reset.
        setValue(initValue); 

        // Set the filter value.
        column.setFilterValue(initValue);
    }, [initValue, gSettingsFullMutations]);

    const onChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const v = e.target.valueAsNumber;
        if (isNaN(v)) return;
        setValue(v);
        gSettingsSet(v);
        column.setFilterValue(v);
    }, [gSettingsFullMutations]);

    return (
        <input
            type="number"
            value={value}
            onChange={onChange}
            placeholder={`Filter ${column.columnDef.header as string}...`}
            className="w-full px-2 py-1 text-sm border rounded"
            min={0}
        />
    );
}

type OnlyAllowedGSettingsKeys = {
    [K in keyof GSettings]: GSettings[K] extends number ? K : never
}[keyof GSettings];

const columnMapping: Record<string, OnlyAllowedGSettingsKeys> = {
    memory: "minMemory",
    vCPU: "minVcpus",
    memory_per_vcpu: "minMemoryPerVcpu",
    GPU: "minGpus",
    GPU_memory: "minGpuMemory",
    maxips: "minMaxips",
    storage: "minStorage",
};

export default function IndividualColumnFilter({
    gSettings,
    gSettingsFullMutations,
    column,
}: {
    gSettings: GSettings | undefined;
    gSettingsFullMutations: number;
    column: Column<Instance>;
}) {
    const set = useCallback((value: number) => {
        const key = columnMapping[column.columnDef.id!];
        if (key && gSettings) {
            gSettings[key] = value;
        }
    }, [column.columnDef.id, gSettingsFullMutations]);

    const key = columnMapping[column.columnDef.id!];
    if (key && gSettings) {
        const value = gSettings[key];
        return (
            <GSettingsNumberFilter
                gSettingsFullMutations={gSettingsFullMutations}
                gSettingsSet={set}
                column={column}
                initValue={value}
            />
        );
    }

    return (
        <input
            type="text"
            value={(column.getFilterValue() as string) ?? ''}
            onChange={(e) => column.setFilterValue(e.target.value)}
            placeholder={`Filter ${column.columnDef.header as string}...`}
            className="w-full px-2 py-1 text-sm border rounded"
        />
    );
}
