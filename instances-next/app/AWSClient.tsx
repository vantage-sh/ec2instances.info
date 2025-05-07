"use client";

import { useInstanceData, columnVisibilityAtoms } from "@/state";
import InstanceTable from "@/components/InstanceTable";
import { Region, Pricing } from "@/types";
import Filters from "@/components/Filters";
import { useMemo, useState } from "react";
import { RowSelectionState } from "@tanstack/react-table";
import dynamicallyDecompress from "@/utils/dynamicallyDecompress";
import DoMigration from "@/components/DoMigration";
import { AtomKeyWhereInstanceIs } from "@/components/InstanceTable";

export default function AWSClient<Instance extends { instance_type: string; pricing: Pricing }>({
    compressedDataPathTemplate,
    regions,
    compressedInstances,
    instanceCount,
    columnAtomKey,
}: {
    compressedDataPathTemplate: string | null;
    regions: Region;
    compressedInstances: [string[], ...Instance[]];
    instanceCount: number;
    columnAtomKey: AtomKeyWhereInstanceIs<Instance>;
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

    const instances = useInstanceData(compressedDataPathTemplate, initialInstances);
    const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

    return (
        <main className="h-screen flex flex-col">
            <DoMigration atomKey={columnAtomKey} />
            <Filters columnAtomKey={columnAtomKey} regions={regions} rowSelection={rowSelection} />
            <div className="flex-1 min-h-0">
                <InstanceTable
                    instances={instances}
                    rowSelection={rowSelection}
                    setRowSelection={setRowSelection}
                    instanceCount={instanceCount}
                    columnAtomKey={columnAtomKey}
                />
            </div>
        </main>
    );
}
