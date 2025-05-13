"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import type * as columnData from "@/utils/colunnData";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface ColumnOption<Key extends keyof typeof columnData> {
    key: Key;
    label: string;
    visible: boolean;
    defaultVisible?: boolean;
}

interface ColumnFilterProps<Key extends keyof typeof columnData> {
    columns: ColumnOption<Key>[];
    onColumnVisibilityChange: (key: Key, visible: boolean) => void;
}

export default function ColumnFilter<Key extends keyof typeof columnData>({
    columns,
    onColumnVisibilityChange,
}: ColumnFilterProps<Key>) {
    const [open, setOpen] = React.useState(false);
    const [searchTerm, setSearchTerm] = React.useState("");

    const filteredColumns = columns.filter((column) =>
        column.label.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSelectAll = () => {
        columns.forEach((column) => {
            if (!column.visible) {
                onColumnVisibilityChange(column.key, true);
            }
        });
    };

    const handleSelectDefaults = () => {
        columns.forEach((column) => {
            const shouldBeVisible = column.defaultVisible ?? false;
            if (column.visible !== shouldBeVisible) {
                onColumnVisibilityChange(column.key, shouldBeVisible);
            }
        });
    };

    return (
        <div className="relative flex flex-col gap-0.5 justify-center">
            <label className="text-xs text-gray-3">Columns</label>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className="w-[200px] justify-between"
                    >
                        Columns
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent sideOffset={-36} align="start" className="p-0">
                    <Command>
                        <CommandInput 
                            placeholder="Search columns..." 
                            value={searchTerm}
                            onValueChange={setSearchTerm}
                        />
                        <CommandList>
                            <CommandEmpty>No columns found.</CommandEmpty>
                            <CommandGroup>
                                {filteredColumns.map((column) => (
                                    <CommandItem
                                        key={column.key}
                                        value={column.key}
                                        onSelect={() => {
                                            onColumnVisibilityChange(
                                                column.key,
                                                !column.visible
                                            );
                                        }}
                                    >
                                        <Check
                                            className={cn(
                                                "mr-2 h-4 w-4",
                                                column.visible ? "opacity-100" : "opacity-0"
                                            )}
                                        />
                                        {column.label}
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                    <div className="flex items-center justify-start gap-2 p-1">
                                    <Button className="cursor-pointer" onSelect={handleSelectAll} size="sm" variant={"outline"}>
                                        Select All</Button>
                                    <Button className="cursor-pointer" 
                                    onSelect={handleSelectDefaults} size="sm" variant={"outline"}>
                                        Select Defaults</Button>
                                </div>
                </PopoverContent>
            </Popover>
        </div>
    );
}
