"use client";

import DoMigration from "@/components/DoMigration";
import Filters from "@/components/Filters";
import InstanceTable from "@/components/InstanceTable";
import { useInstanceData } from "@/state";
import { AzureInstance } from "@/utils/colunnData/azure";
import dynamicallyDecompress from "@/utils/dynamicallyDecompress";
import { RowSelectionState } from "@tanstack/react-table";
import { useMemo, useState } from "react";

type Props = {
    instanceCount: number;
    regions: {
        [key: string]: string;
    };
    compressedDataPathTemplate: string;
    compressedInstances: [string[], ...AzureInstance[]];
};

export default function AzureClient({
    instanceCount,
    regions,
    compressedDataPathTemplate,
    compressedInstances,
}: Props) {
    const initialInstances = useMemo(() => {
        const rainbowTable = compressedInstances.shift() as string[];
        if (!Array.isArray(rainbowTable)) {
            // This is probably dev.
            compressedInstances.unshift(rainbowTable);
            return compressedInstances as AzureInstance[];
        }
        return compressedInstances.map((instance) =>
            // @ts-expect-error: This is wrong, but close enough to work.
            dynamicallyDecompress(instance as AzureInstance, rainbowTable),
        );
    }, [compressedInstances]);

    const allInstances = useInstanceData(
        compressedDataPathTemplate,
        // @ts-expect-error: This is wrong, but close enough to work.
        initialInstances,
    );
    const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

    return (
        <main className="h-screen flex flex-col">
            <DoMigration atomKey="azure" />
            <Filters
                columnAtomKey="azure"
                regions={{
                    local_zone: {},
                    main: regions,
                    wavelength: {},
                }}
                rowSelection={rowSelection}
                ecuRename="ACU"
            />
            <div className="flex-1 min-h-0">
                <InstanceTable
                    instances={allInstances}
                    rowSelection={rowSelection}
                    setRowSelection={setRowSelection}
                    instanceCount={instanceCount}
                    columnAtomKey="azure"
                    ecuRename="ACU"
                />
            </div>
        </main>
    );
}
