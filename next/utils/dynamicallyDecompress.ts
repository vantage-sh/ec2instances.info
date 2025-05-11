import { Pricing } from "@/types";
import processRainbowTable from "./processRainbowTable";

export default function dynamicallyDecompress<
    Instance extends { pricing: Pricing },
>(instance: Instance, rainbowTable: string[]): Instance {
    let pricingGot = false;
    return {
        ...instance,
        get pricing() {
            if (!pricingGot) {
                pricingGot = true;
                processRainbowTable(rainbowTable, instance);
            }
            return instance.pricing;
        },
    };
}
