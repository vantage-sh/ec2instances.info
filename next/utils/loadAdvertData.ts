import marketingJson from "@/marketing.json";
import { validateMarketing } from "@/schemas/marketing";

const marketingData = validateMarketing(marketingJson);

async function loadAdvertData() {
    return marketingData;
}

export default loadAdvertData();

export { marketingData };
