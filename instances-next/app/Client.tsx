"use client";

import { useState } from "react";
import { Instance, Region } from "./types";
import InstanceTable from "./components/InstanceTable";
import Filters from "./components/Filters";

export default function Home({
    instances,
    regions,
}: {
    instances: Instance[];
    regions: Region;
}) {
    return (
        <main className="h-screen flex flex-col">
            <Filters regions={regions} />
            <div className="flex-1 min-h-0">
                <InstanceTable instances={instances} />
            </div>
        </main>
    );
}
