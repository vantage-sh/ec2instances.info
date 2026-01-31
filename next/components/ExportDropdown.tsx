"use client";

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
import { toast } from "sonner";
import { useTranslations } from "gt-next";

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

export default function ExportDropdown() {
    const [open, setOpen] = useState(false);
    const t = useTranslations();

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
        toast.success(t("filters.export.csvCopied"));
    }

    async function copyTsvClick() {
        const rows = await callActiveTableDataFormatter();
        const tsv = rows.map((row) => row.map(csvEscape).join("\t")).join("\n");
        navigator.clipboard.writeText(tsv);
        toast.success(t("filters.export.tsvCopied"));
    }

    async function copyMdClick() {
        const [rows, markdownTable] = await Promise.all([
            callActiveTableDataFormatter(),
            import("markdown-table").then((m) => m.markdownTable),
        ]);
        const md = markdownTable(rows);
        navigator.clipboard.writeText(md);
        toast.success(t("filters.export.markdownCopied"));
    }

    function closeWrap(fn: () => void) {
        return () => {
            setOpen(false);
            fn();
        };
    }

    const exportLabel = t("filters.export.export");

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    role="combobox"
                    aria-expanded={open}
                    className="my-auto justify-between text-black py-4.5"
                    aria-label={exportLabel}
                >
                    <Save className="mr-2 h-4 w-4" />
                    {exportLabel}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
                <DropdownMenuItem onSelect={closeWrap(downloadCsvClick)}>
                    {t("filters.export.downloadCsv")}
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={closeWrap(copyCsvClick)}>
                    {t("filters.export.copyCsv")}
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={closeWrap(copyTsvClick)}>
                    {t("filters.export.copyTsv")}
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={closeWrap(copyMdClick)}>
                    {t("filters.export.copyMarkdown")}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
