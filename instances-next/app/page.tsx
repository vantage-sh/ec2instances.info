"use client";

import InstanceTable from "@/components/InstanceTable";
import Filters from "@/components/Filters";
import { useInstanceData } from "@/state";
import Loading from "@/components/Loading";

export default function Home() {
    const [instances, regions] = useInstanceData("/instances-compressed.msgpack");
    if (!instances || !regions) {
        return <Loading />;
    }
    return (
        <main className="h-screen flex flex-col">
            <Filters regions={regions} />
            <div className="flex-1 min-h-0">
                <InstanceTable instances={instances} />
            </div>
        </main>
    );
}
