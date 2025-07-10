import { validateMarketing } from "@/schemas/marketing";
import { MARKETING_JSON_URL } from "@/components/Advert";

async function loadAdvertData() {
    const res = await fetch(MARKETING_JSON_URL);
    if (!res.ok) {
        throw new Error("Failed to fetch marketing data");
    }
    const newData = await res.json();
    return validateMarketing(newData);
}

export default loadAdvertData();
