import { useState, useEffect } from "react";

export default function useStateWithCurrentQuerySeeded() {
    const [state, setState] = useState("");
    useEffect(() => {
        setState(window.location.search);
    }, []);
    return [state, setState] as const;
}
