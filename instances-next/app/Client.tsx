"use client";

import { useInstanceData } from "@/state";
import InstanceTable from "@/components/InstanceTable";
import { Instance, Region } from "@/types";
import Filters from "@/components/Filters";
import { useState } from "react";
import { RowSelectionState } from "@tanstack/react-table";
import { columnVisibilityAtom } from "@/state";
import DoMigration from "@/components/DoMigration";

export default function Client({
    regions,
    first30Instances,
}: {
    regions: Region;
    first30Instances: Instance[];
}) {
    const instances = useInstanceData(
        "/remaining-instances.msgpack.xz",
        first30Instances,
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
