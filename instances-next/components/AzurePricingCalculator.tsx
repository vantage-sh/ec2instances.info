"use client";

import type { AzureInstance } from "@/utils/colunnData/azure";
import processRainbowTable from "@/utils/processRainbowTable";
import { useMemo } from "react";

function Calculator({ instance, regions }: { instance: AzureInstance, regions: Record<string, string> }) {
    // TODO: Implement the calculator
    return null;
}

type AzurePricingCalculatorProps = {
    rainbowTable: string[];
    compressedInstance: AzureInstance;
    regions: Record<string, string>;
};

export default function AzurePricingCalculator({ rainbowTable, compressedInstance, regions }: AzurePricingCalculatorProps) {
    const instance = useMemo(() => {
        if (!Array.isArray(compressedInstance.pricing)) return compressedInstance;
        return processRainbowTable(rainbowTable, compressedInstance);
    }, [rainbowTable, compressedInstance]);

    return (
        <Calculator
            instance={instance}
            regions={regions}
        />
    );
}
