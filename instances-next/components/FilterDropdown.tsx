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
    options: Option[];
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

    const filteredOptions = options.filter((option) =>
        option.label.toLowerCase().includes(searchTerm.toLowerCase()),
    );

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
        <div className="btn-group-vertical relative" ref={dropdownRef}>
            <label className="dropdown-label mb-1">{label}</label>
            <button
                className="dropdown-toggle p-0 border-0 d-flex align-items-center h-auto small fw-semibold text-decoration-none link-dark"
                onClick={() => setIsOpen(!isOpen)}
            >
                {icon && <i className={`icon-${icon} icon-white me-1`}></i>}
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
