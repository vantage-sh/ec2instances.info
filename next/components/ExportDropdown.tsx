import { useState } from "react";
import { callActiveTableDataFormatter } from "@/state";
import { Button } from "./ui/button";
import { Save } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
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
            </DropdownMenuTrigger>
            <DropdownMenuContent>
                <DropdownMenuItem onSelect={closeWrap(downloadCsvClick)}>
                    Download CSV
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={closeWrap(copyCsvClick)}>
                    Copy CSV
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={closeWrap(copyTsvClick)}>
                    Copy TSV
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={closeWrap(copyMdClick)}>
                    Copy Markdown Table
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
