"use client";

import { columnVisibilityAtoms } from "@/state";
import { useEffect } from "react";
import * as columnData from "@/utils/colunnData";

export default function DoMigration<
    AtomKey extends keyof typeof columnVisibilityAtoms,
>({ atomKey }: { atomKey: AtomKey }) {
    useEffect(() => {
        const v = columnData[atomKey].doDataTablesMigration();
        if (v) {
            columnVisibilityAtoms[atomKey].set(v);
        }
    }, [atomKey]);

    return null;
}
