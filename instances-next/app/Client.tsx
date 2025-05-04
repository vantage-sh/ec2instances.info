"use client";

import { useInstanceData } from "@/state";
import InstanceTable from "@/components/InstanceTable";
import { Instance, Region } from "@/types";
import Filters from "@/components/Filters";
import { useMemo, useState } from "react";
import { RowSelectionState } from "@tanstack/react-table";
import { columnVisibilityAtom } from "@/state";
import DoMigration from "@/components/DoMigration";
import dynamicallyDecompress from "@/utils/dynamicallyDecompress";

export default function Client({
    regions,
    compressedInstances,
}: {
    regions: Region;
    compressedInstances: [string[], ...Instance[]];
}) {
    const initialInstances = useMemo(() => {
        const rainbowTable = compressedInstances.shift() as string[];
        if (!Array.isArray(rainbowTable)) {
            // This is probably dev.
            compressedInstances.unshift(rainbowTable);
            return compressedInstances as Instance[];
        }
        return compressedInstances.map((instance) => dynamicallyDecompress(instance as Instance, rainbowTable));
    }, [compressedInstances]);

    const instances = useInstanceData(
        "/remaining-instances-p{}.msgpack.xz",
        initialInstances,
    );
    const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

    return (
        <main className="h-screen flex flex-col">
            <DoMigration path="/" atom={columnVisibilityAtom} />
            <Filters regions={regions} rowSelection={rowSelection} />
            <div className="flex-1 min-h-0">
                <InstanceTable
                    instances={instances}
                    rowSelection={rowSelection}
                    setRowSelection={setRowSelection}
                />
            </div>
        </main>
    );
}
