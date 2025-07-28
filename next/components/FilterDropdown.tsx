"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandItem,
    CommandList,
    CommandTraditionalInput,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";

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
    hideSearch: boolean;
    hideLabel?: boolean;
    icon?: string;
    small?: boolean;
    ariaControls?: string;
}

export default function FilterDropdown({
    label,
    value,
    onChange,
    options,
    hideSearch,
    hideLabel,
    icon,
    small,
    ariaControls,
}: FilterDropdownProps) {
    const buttonId = React.useId();
    const [open, setOpen] = React.useState(false);
    const [searchTerm, setSearchTerm] = React.useState("");

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

    const filteredGroups = React.useMemo(() => {
        const filtered: typeof groupedOptions = {};
        for (const [group, groupOptions] of Object.entries(groupedOptions)) {
            if (group === "Frequently Used" && searchTerm.length > 0) continue;
            const filteredOptions = groupOptions.filter((option) => {
                const x = (option.label + option.value)
                    .toLowerCase()
                    .replaceAll(".", "")
                    .includes(searchTerm.toLowerCase().replaceAll(".", ""));
                return x;
            });
            if (filteredOptions.length > 0) {
                filtered[group] = filteredOptions;
            }
        }
        return filtered;
    }, [groupedOptions, searchTerm]);

    return (
        <div className="flex flex-col gap-0.5">
            {!hideLabel && (
                <label htmlFor={buttonId} className="text-xs text-gray-1">
                    {label}
                </label>
            )}
            <Popover
                open={open}
                onOpenChange={setOpen}
                aria-controls={ariaControls}
            >
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        size="sm"
                        role="combobox"
                        aria-expanded={open}
                        aria-label={hideLabel ? label : undefined}
                        id={buttonId}
                        className={cn(
                            "w-full justify-between text-black py-4.5",
                            small ? "text-xs" : "",
                        )}
                    >
                        {icon && (
                            <i
                                aria-hidden="true"
                                className={`icon-${icon} text-white me-1`}
                            ></i>
                        )}
                        {selectedOption?.label || "Select..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                    <Command>
                        {!hideSearch && (
                            <CommandTraditionalInput
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder={`Search ${label}...`}
                            />
                        )}
                        <CommandList>
                            <CommandEmpty>No options found.</CommandEmpty>
                            {Object.entries(filteredGroups).map(
                                ([group, groupOptions]) => (
                                    <CommandGroup key={group}>
                                        {group !== "Other" && (
                                            <div className="text-xs text-gray-3 px-2 py-1.5">
                                                {group}
                                            </div>
                                        )}
                                        {groupOptions.map((option) => (
                                            <CommandItem
                                                key={option.value}
                                                value={option.value}
                                                onSelect={() => {
                                                    onChange(option.value);
                                                    setOpen(false);
                                                }}
                                                aria-checked={
                                                    value === option.value
                                                }
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
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                ),
                            )}
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
        </div>
    );
}
