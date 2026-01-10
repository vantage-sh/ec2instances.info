"use client";

import { ChevronUpIcon, ChevronDownIcon } from "lucide-react";

type SortToggleProps = {
    value: boolean | undefined;
    setValue: (value: boolean) => void;
};

export default function SortToggle({ value, setValue }: SortToggleProps) {
    return (
        <div className="ml-1 absolute right-1 top-0 inline-block dark:invert">
            <button
                className={`${
                    value === false ? "text-gray-800" : "text-gray-400"
                } p-0 text-xs block cursor-pointer hover:text-gray-700 overflow-hidden w-4 h-3`}
                title="Sort ascending"
                aria-pressed={value === false}
                onClick={() => setValue(false)}
            >
                <ChevronUpIcon className="relative w-4 h-4" />
            </button>
            <button
                className={`${
                    value === true ? "text-gray-800" : "text-gray-400"
                } p-0 text-xs block cursor-pointer hover:text-gray-700 overflow-hidden w-4 h-3 ml-[5px]`}
                title="Sort descending"
                aria-pressed={value === true}
                onClick={() => setValue(true)}
            >
                <ChevronDownIcon className="relative -top-1 w-4 h-4" />
            </button>
        </div>
    );
}
