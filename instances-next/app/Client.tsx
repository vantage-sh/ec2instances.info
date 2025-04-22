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
        <main className="container-fluid py-4">
            <Filters regions={regions} />
            <InstanceTable instances={instances} />
        </main>
    );
}
