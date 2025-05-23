"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
    const [open, setOpen] = React.useState(false);

    const groupedOptions = React.useMemo(() => {
        type GroupedOptions = Record<string, Option[]>;
        const groups: GroupedOptions = {};

        for (const option of options) {
            const group = option.group || "Other";
            let groupedOptions = groups[group];
            if (!groupedOptions) {
                groupedOptions = [];
            }
            groupedOptions.push(option);
            groups[group] = groupedOptions;
        }
        return groups;
    }, [options]);

    const selectedOption = options.find((option) => option.value === value);

    return (
        <div className="flex flex-col gap-0.5">
            <label className="text-xs text-gray-3">{label}</label>
            <DropdownMenu open={open} onOpenChange={setOpen}>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="outline"
                        size="sm"
                        role="combobox"
                        aria-expanded={open}
                        className="w-full justify-between text-black py-4.5"
                    >
                        {icon && (
                            <i className={`icon-${icon} text-white me-1`}></i>
                        )}
                        {selectedOption?.label || "Select..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-full">
                    {Object.entries(groupedOptions).map(
                        ([group, groupOptions]) => (
                            <DropdownMenuGroup key={group}>
                                {group !== "Other" && (
                                    <DropdownMenuLabel className="text-xs text-gray-3">
                                        {group}
                                    </DropdownMenuLabel>
                                )}
                                {groupOptions.map((option: Option) => (
                                    <DropdownMenuItem
                                        key={option.value}
                                        onSelect={() => {
                                            onChange(option.value);
                                            setOpen(false);
                                        }}
                                        className="flex items-center"
                                    >
                                        <Check
                                            className={cn(
                                                "mr-2 h-4 w-4",
                                                value === option.value
                                                    ? "opacity-100"
                                                    : "opacity-0",
                                            )}
                                        />
                                        <span>{option.label}</span>
                                        {option.group && (
                                            <span className="text-gray-500 text-xs ml-2">
                                                {option.value}
                                            </span>
                                        )}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuGroup>
                        ),
                    )}
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}
