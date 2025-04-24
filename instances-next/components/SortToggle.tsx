"use client";

type SortToggleProps = {
    value: boolean | undefined;
    setValue: (value: boolean) => void;
}

export default function SortToggle({ value, setValue }: SortToggleProps) {
    return (
        <div className="ml-1 w-max inline-block">
            <button
                className={`${value === false ? "" : "text-gray-3"} p-0 text-xs block mb-[-8px] cursor-pointer`}
                aria-label="Sort ascending"
                aria-pressed={value === false}
                onClick={() => setValue(false)}
            >
                ↑
            </button>
            <button
                className={`${value === true ? "" : "text-gray-3"} p-0 text-xs block ml-[5px] cursor-pointer`}
                aria-label="Sort descending"
                aria-pressed={value === true}
                onClick={() => setValue(true)}
            >
                ↓
            </button>
        </div>
    );
}
