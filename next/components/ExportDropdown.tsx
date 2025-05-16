import { useState } from "react";
import { callActiveTableDataFormatter } from "@/state";
import { Button } from "./ui/button";
import { ChevronsUpDown, Save } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Command, CommandItem } from "./ui/command";

function csvEscape(input: string) {
    // Check if the input contains special characters or double quotes
    if (/[",\n]/.test(input)) {
        // If it does, wrap the input in double quotes and escape existing double quotes
        return `"${input.replace(/"/g, '""')}"`;
    } else {
        // If no special characters are present, return the input as is
        return input;
    }
}

async function makeCsv() {
    const rows = await callActiveTableDataFormatter();
    return rows.map((row) => row.map(csvEscape).join(",")).join("\n");
}

async function downloadCsvClick() {
    const csv = await makeCsv();
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${document.title}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

async function copyCsvClick() {
    const csv = await makeCsv();
    navigator.clipboard.writeText(csv);
}

async function copyTsvClick() {
    const rows = await callActiveTableDataFormatter();
    const tsv = rows.map((row) => row.map(csvEscape).join("\t")).join("\n");
    navigator.clipboard.writeText(tsv);
}

async function copyMdClick() {
    const [rows, markdownTable] = await Promise.all([
        callActiveTableDataFormatter(),
        import("markdown-table").then((m) => m.markdownTable),
    ]);
    const md = markdownTable(rows);
    navigator.clipboard.writeText(md);
}

export default function ExportDropdown() {
    const [open, setOpen] = useState(false);

    function closeWrap(fn: () => void) {
        return () => {
            setOpen(false);
            fn();
        };
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    role="combobox"
                    aria-expanded={open}
                    className="my-auto justify-between text-black py-4.5"
                >
                    <Save className="mr-2 h-4 w-4" />
                    Export
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
                <Command>
                    <CommandItem onSelect={closeWrap(downloadCsvClick)}>
                        Download CSV
                    </CommandItem>
                    <CommandItem onSelect={closeWrap(copyCsvClick)}>
                        Copy CSV
                    </CommandItem>
                    <CommandItem onSelect={closeWrap(copyTsvClick)}>
                        Copy TSV
                    </CommandItem>
                    <CommandItem onSelect={closeWrap(copyMdClick)}>
                        Copy Markdown Table
                    </CommandItem>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
