"use client";

import { useState, useRef, useEffect } from "react";
import { ColumnVisibility } from "@/utils/columnVisibility";

interface ColumnOption {
    key: keyof ColumnVisibility;
    label: string;
    visible: boolean;
}

interface ColumnFilterProps {
    columns: ColumnOption[];
    onColumnVisibilityChange: (
        key: keyof ColumnVisibility,
        visible: boolean,
    ) => void;
}

export default function ColumnFilter({
    columns,
    onColumnVisibilityChange,
}: ColumnFilterProps) {
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

    const filteredColumns = columns.filter((column) =>
        column.label.toLowerCase().includes(searchTerm.toLowerCase()),
    );

    return (
        <div className="btn-group-vertical relative" ref={dropdownRef}>
            <label className="dropdown-label mb-1">Columns</label>
            <button
                className="dropdown-toggle p-0 border-0 d-flex align-items-center h-auto small fw-semibold text-decoration-none link-dark"
                onClick={() => setIsOpen(!isOpen)}
            >
                <i className="icon-filter icon-white me-1"></i>
                <span className="text">Columns</span>
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
                            className="w-full px-2 py-1 border rounded"
                            placeholder="Search columns..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </li>
                    {filteredColumns.map((column) => (
                        <li key={column.key}>
                            <button
                                className={`block px-4 py-2 text-sm hover:bg-purple-100 ${
                                    column.visible
                                        ? "bg-purple-100 font-medium"
                                        : ""
                                } w-full text-left cursor-pointer`}
                                onClick={(e) => {
                                    e.preventDefault();
                                    onColumnVisibilityChange(
                                        column.key,
                                        !column.visible,
                                    );
                                }}
                            >
                                <span>{column.label}</span>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
