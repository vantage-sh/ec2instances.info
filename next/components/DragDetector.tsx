import { useCallback } from "react";

type DragDetectorProps = {
    onNotDrag: () => void;
    className?: string;
    children: React.ReactNode;
};

export default function DragDetector({
    onNotDrag,
    children,
    className,
}: DragDetectorProps) {
    const checkIfDragging = useCallback(() => {
        // Check if more than 5 characters are selected
        const selection = window.getSelection();
        if (!selection || selection.toString().length < 5) {
            onNotDrag();
        }
    }, [onNotDrag]);

    return (
        <tr className={className} onClick={checkIfDragging}>
            {children}
        </tr>
    );
}
