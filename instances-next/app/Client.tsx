"use client";

import { useInstanceData } from "@/state";
import InstanceTable from "@/components/InstanceTable";
import { Instance, Region } from "@/types";
import Filters from "@/components/Filters";
import { useMemo, useState } from "react";
import { RowSelectionState } from "@tanstack/react-table";
import { columnVisibilityAtom } from "@/state";
import DoMigration from "@/components/DoMigration";
import processRainbowTable from "@/utils/processRainbowTable";

export default function Client({
    regions,
    compressedInstances,
}: {
    regions: Region;
    compressedInstances: [string[], ...Instance[]];
}) {
    const first50Instances = useMemo(() => {
        const rainbowTable = compressedInstances.shift() as string[];
        if (!Array.isArray(rainbowTable)) {
            // This hook re-ran for some reason. Probably dev.
            compressedInstances.unshift(rainbowTable);
            return compressedInstances as Instance[];
        }
        for (const i of compressedInstances) {
            processRainbowTable(rainbowTable, i as Instance);
        }
        return compressedInstances as Instance[];
    }, [compressedInstances]);

    const instances = useInstanceData(
        "/remaining-instances.msgpack.xz",
        first50Instances,
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
