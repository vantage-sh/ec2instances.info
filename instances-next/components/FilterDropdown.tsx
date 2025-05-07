"use client";

import { useState, useRef, useEffect } from "react";

interface Option {
    value: string;
    label: string;
    group?: string;
}

interface FilterDropdownProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    options: Option[] | readonly Option[];
    icon?: string;
}

export default function FilterDropdown({
    label,
    value,
    onChange,
    options,
    icon,
}: FilterDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        }

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const filteredOptions = options.filter((option) => {
        try {
            return option.label.toLowerCase().includes(searchTerm.toLowerCase());
        } catch (error) {
            console.error("Error filtering options:", error, option);
            return "";
        }
    });

    const groupedOptions = filteredOptions.reduce(
        (groups, option) => {
            const group = option.group || "Other";
            if (!groups[group]) {
                groups[group] = [];
            }
            groups[group].push(option);
            return groups;
        },
        {} as Record<string, Option[]>,
    );

    const selectedOption = options.find((option) => option.value === value);

    return (
        <div className="relative flex flex-col gap-0.5 justify-center items-start" ref={dropdownRef}>
            <label className="text-xs text-gray-3 ">{label}</label>
            <button
                className="flex items-center justify-start gap-1 bg-white border-0 text-sm font-semibold text-decoration-none"
                onClick={() => setIsOpen(!isOpen)}
            >
                {icon ? <i className={`icon-${icon} text-white me-1`}></i> : null}
                <span className="text">
                    {selectedOption?.label || "Select..."}
                </span>
                <span className="caret"></span>
            </button>
            {isOpen && (
                <ul
                    className="dropdown-menu absolute left-0 top-full mt-1 z-50 bg-white shadow-lg rounded-md min-w-[200px] max-h-[400px] overflow-y-auto"
                    role="menu"
                >
                    <li className="sticky bg-white p-2 top-[-8px]">
                        <input
                            type="text"
                            className="w-full px-2 py-1 border rounded cursor-pointer"
                            placeholder="Search..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </li>
                    {Object.entries(groupedOptions).map(
                        ([group, groupOptions]) => (
                            <div key={group}>
                                {group !== "Other" && (
                                    <div className="px-2 py-1 bg-gray-50">
                                        <span className="font-semibold text-sm">
                                            {group}
                                        </span>
                                    </div>
                                )}
                                {groupOptions.map((option) => (
                                    <li key={option.value}>
                                        <a
                                            className={`block px-4 py-2 text-sm hover:bg-gray-100 ${
                                                option.value === value
                                                    ? "bg-gray-100 font-medium"
                                                    : ""
                                            }`}
                                            href="#"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                onChange(option.value);
                                                setIsOpen(false);
                                            }}
                                        >
                                            <span>{option.label}</span>
                                            {option.group && (
                                                <span className="text-gray-500 text-xs ml-2">
                                                    {option.value}
                                                </span>
                                            )}
                                        </a>
                                    </li>
                                ))}
                            </div>
                        ),
                    )}
                </ul>
            )}
        </div>
    );
}
