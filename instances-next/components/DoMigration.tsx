"use client";

import { columnVisibilityAtoms } from "@/state";
import { useEffect } from "react";
import * as columnData from "@/utils/colunnData";

export default function DoMigration<AtomKey extends keyof typeof columnVisibilityAtoms>({
    atomKey,
}: {
    atomKey: AtomKey;
}) {
    useEffect(() => {
        const v = columnData[atomKey].doDataTablesMigration();
        if (v) {
            // @ts-expect-error: I can't figure out this type error and don't want to spend time on it
            columnVisibilityAtoms[atomKey].set(v);
        }
    }, [atomKey]);

    return null;
}
