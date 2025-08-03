/** Defines the A/B group for the user. */
export let abGroup = false;

/** Defines if the browser is blocking localStorage. */
export let browserBlockingLocalStorage = false;

if (typeof window !== "undefined") {
    try {
        const localStorageValue = localStorage.getItem("vantage-ab-group");
        if (localStorageValue) {
            abGroup = localStorageValue === "true";
        } else {
            const random = Math.random();
            abGroup = random < 0.5;
            localStorage.setItem("vantage-ab-group", abGroup.toString());
        }
    } catch {
        // Browser is blocking localStorage.
        browserBlockingLocalStorage = true;
    }
}
