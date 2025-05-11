"use client";

import type { AzureInstance } from "@/utils/colunnData/azure";
import processRainbowTable from "@/utils/processRainbowTable";
import { useMemo } from "react";

function Calculator({ instances, regions }: { instances: AzureInstance, regions: Record<string, string> }) {
    // TODO: Implement the calculator
    return null;
}

type AzurePricingCalculatorProps = {
    rainbowTable: string[];
    compressedInstance: AzureInstance;
    regions: Record<string, string>;
};

export default function AzurePricingCalculator({ rainbowTable, compressedInstance, regions }: AzurePricingCalculatorProps) {
    const instances = useMemo(() => {
        if (!Array.isArray(compressedInstance.pricing)) return compressedInstance;
        // @ts-expect-error: Close enough for our purposes
        return processRainbowTable(rainbowTable, compressedInstance) as AzureInstance;
    }, [rainbowTable, compressedInstance]);

    return (
        <Calculator
            instances={instances}
            regions={regions}
        />
    );
}
