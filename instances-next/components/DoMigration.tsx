import { doDataTablesMigration } from "@/utils/columnVisibility";
import type { Atom } from "atomtree";
import { useEffect } from "react";

export default function DoMigration({
    path,
    atom,
}: {
    path: string;
    atom: Atom<any>;
}) {
    useEffect(() => {
        const v = doDataTablesMigration(path);
        if (v) {
            atom.set(v);
        }
    }, [path]);

    return null;
}
