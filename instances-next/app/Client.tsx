"use client";

import { useInstanceData } from "@/state";
import InstanceTable from "@/components/InstanceTable";
import Loading from "@/components/Loading";
import { Instance } from "@/types";

export default function Client({ first30Instances }: { first30Instances: Instance[] }) {
    const instances = useInstanceData("/remaining-instances.msgpack.xz", first30Instances);
    if (!instances) {
        return <Loading />;
    }
    return <InstanceTable instances={instances} />;
}
