"use client";

import {
    useReactTable,
    getCoreRowModel,
    getFilteredRowModel,
    flexRender,
    Row,
    ColumnFiltersState,
    SortingState,
    getSortedRowModel,
} from "@tanstack/react-table";
import { Instance } from "@/types";
import {
    columnVisibilityAtom,
    useSearchTerm,
    useSelectedRegion,
    useReservedTerm,
    useHookToExportButton,
    useGSettings,
    usePricingUnit,
    useDuration,
    rowSelectionAtom,
    useCompareOn,
} from "@/state";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import IndividualColumnFilter from "./IndividualColumnFilter";
import columnsGen from "./columns";
import SortToggle from "./SortToggle";

interface InstanceTableProps {
    instances: Instance[];
}

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

// Hack to stop Tanstack Table from thinking the array changed.
const emptyColumnFilters: ColumnFiltersState = [];

export default function InstanceTable({ instances }: InstanceTableProps) {
    const columnVisibility = columnVisibilityAtom.use();
    const [searchTerm] = useSearchTerm();
    const [selectedRegion] = useSelectedRegion();
    const [pricingUnit] = usePricingUnit();
    const [costDuration] = useDuration();
    const [reservedTerm] = useReservedTerm();
    const [gSettings, gSettingsFullMutations] = useGSettings();
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
    const rowSelection = rowSelectionAtom.use();
    const [compareOn] = useCompareOn();
    const [sorting, setSorting] = useState<SortingState>([]);

    // Initially set the column filters to the gSettings.
    useEffect(() => {
        if (!gSettings) return;
        setColumnFilters([
            {
                id: "memory",
                value: gSettings.minMemory,
            },
            {
                id: "vCPU",
                value: gSettings.minVcpus,
            },
            {
                id: "memory_per_vcpu",
                value: gSettings.minMemoryPerVcpu,
            },
            {
                id: "GPU",
                value: gSettings.minGpus,
            },
            {
                id: "GPU_memory",
                value: gSettings.minGpuMemory,
            },
            {
                id: "maxips",
                value: gSettings.minMaxips,
            },
            {
                id: "storage",
                value: gSettings.minStorage,
            },
        ]);
    }, [gSettingsFullMutations]);

    const columns = columnsGen(selectedRegion, pricingUnit, costDuration, reservedTerm);

    const data = useMemo(() => {
        if (compareOn) {
            return instances.filter(i => rowSelection[i.instance_type]);
        }
        return instances;
    }, [compareOn, rowSelection, instances]);

    const table = useReactTable({
        data,
        getRowId: (row) => row.instance_type,
        columns,
        state: {
            columnVisibility,
            globalFilter: compareOn ? undefined : searchTerm,
            columnFilters: compareOn ? emptyColumnFilters : columnFilters,
            rowSelection,
            sorting,
        },
        defaultColumn: {
            size: 200,
            minSize: 50,
            maxSize: 500,
        },
        enableFilters: true,
        onColumnFiltersChange: setColumnFilters,
        enableMultiRowSelection: true,
        onRowSelectionChange: (state) => {
            if (typeof state === "function") {
                return rowSelectionAtom.mutate((old) => {
                    const res = state(old);
                    const oldKeys = Object.keys(old);
                    for (const key of oldKeys) {
                        if (key in res) {
                            old[key] = res[key];
                        } else {
                            delete old[key];
                        }
                    }
                    const onlyNew = Object.keys(res).filter(k => !(k in old));
                    for (const key of onlyNew) {
                        old[key] = res[key];
                    }
                    return old;
                });
            }
            rowSelectionAtom.set(state);
        },
        columnResizeMode: "onChange",
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getSortedRowModel: getSortedRowModel(),
    });

    useHookToExportButton(() => {
        let csv = "";
        for (const header of table.getHeaderGroups()) {
            csv +=
                header.headers
                    .map((h) =>
                        csvEscape(
                            h.getContext().column.columnDef.header as string,
                        ),
                    )
                    .join(",") + "\n";
        }
        for (const row of table.getRowModel().rows) {
            csv +=
                row
                    .getVisibleCells()
                    .map((c) => csvEscape(String(c.getContext().getValue())))
                    .join(",") + "\n";
        }
        if (typeof window !== "undefined") {
            const filename = `${document.title}.csv`;
            const blob = new Blob([csv], { type: "text/csv" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = filename;
            a.click();
        }
    });

    const tableContainerRef = useRef<HTMLDivElement>(null);
    const tableBodyRef = useRef<HTMLTableSectionElement>(null);

    const { rows } = table.getRowModel();
    const rowVirtualizer = useVirtualizer({
        count: rows.length,
        getScrollElement: () => tableContainerRef.current,
        estimateSize: () => 35,
        overscan: 10,
    });

    const virtualRows = rowVirtualizer.getVirtualItems();
    const totalHeight = rowVirtualizer.getTotalSize();
    const paddingTop = virtualRows.length > 0 ? virtualRows[0].start : 0;
    const paddingBottom =
        virtualRows.length > 0
            ? totalHeight - virtualRows[virtualRows.length - 1].end
            : 0;

    // Handle synchronising the rows with the global settings.
    const first = useRef(true);
    useEffect(() => {
        if (first.current) {
            // Also zero the row selection atom in case it was set from a previous render
            rowSelectionAtom.set({});
            first.current = false;
        }
        if (!gSettings) return;
        const selectedInstances = gSettings.selected;
        for (const row of rows) {
            row.toggleSelected(selectedInstances.includes(row.original.instance_type));
        }
    }, [gSettingsFullMutations, rows]);

    const handleRow = useCallback(
        (row: Row<Instance>) => {
            // Row checking is off when comparing.
            if (compareOn) return;

            // Select the row and update the global settings.
            if (!gSettings) return;
            row.toggleSelected();
            const selectedInstances = gSettings.selected;
            if (selectedInstances.includes(row.original.instance_type)) {
                selectedInstances.splice(
                    selectedInstances.indexOf(row.original.instance_type),
                    1,
                );
            } else {
                selectedInstances.push(row.original.instance_type);
            }
            gSettings.selected = selectedInstances;
        },
        [gSettingsFullMutations, compareOn],
    );

    return (
        <div className="w-full h-full">
            <div ref={tableContainerRef} className="h-full overflow-auto">
                <table className="w-full table-fixed border-collapse">
                    <colgroup>
                        {table.getVisibleLeafColumns().map((column) => (
                            <col
                                key={column.id}
                                style={{ width: `${column.getSize()}px` }}
                            />
                        ))}
                    </colgroup>
                    <thead className="sticky top-0 z-10 bg-gray-50">
                        {table.getHeaderGroups().map((headerGroup) => (
                            <tr key={headerGroup.id}>
                                {headerGroup.headers.map((header) => (
                                    <th
                                        key={header.id}
                                        className="whitespace-nowrap overflow-hidden text-ellipsis text-left relative"
                                    >
                                        <div className="mx-2 mt-2">
                                            {flexRender(
                                                header.column.columnDef.header,
                                                header.getContext(),
                                            )}
                                            <SortToggle
                                                value={sorting.find(s => s.id === header.id)?.desc}
                                                setValue={(value) => setSorting((old) => {
                                                    const inside = old.find(s => s.id === header.id);
                                                    if (inside?.desc === value) {
                                                        // Remove the sorting if it's already set.
                                                        return old.filter(s => s.id !== header.id);
                                                    }
                                                    if (inside) {
                                                        return old.map(s => s.id === header.id ? { ...s, desc: value } : s);
                                                    }
                                                    return [...old, { id: header.id, desc: value }];
                                                })}
                                            />
                                        </div>
                                        <div
                                            onMouseDown={header.getResizeHandler()}
                                            onTouchStart={header.getResizeHandler()}
                                            className={`absolute right-0 top-0 bottom-0 w-1 cursor-col-resize select-none touch-none z-20 ${
                                                header.column.getIsResizing() ? 'bg-blue-500' : 'bg-gray-200'
                                            }`}
                                        />
                                        {header.column.getCanFilter() && !compareOn && (
                                            <div className="mt-2 mb-2 ml-2 mr-3">
                                                <IndividualColumnFilter
                                                    gSettings={gSettings}
                                                    gSettingsFullMutations={gSettingsFullMutations}
                                                    column={header.column}
                                                />
                                            </div>
                                        )}
                                    </th>
                                ))}
                                <th></th>
                            </tr>
                        ))}
                    </thead>
                    <tbody ref={tableBodyRef} className="relative">
                        {paddingTop > 0 && (
                            <tr>
                                <td
                                    style={{ height: `${paddingTop}px` }}
                                    colSpan={
                                        table.getVisibleLeafColumns().length
                                    }
                                />
                            </tr>
                        )}
                        {virtualRows.map((virtualRow) => {
                            const row = rows[virtualRow.index];
                            return (
                                <tr
                                    onClick={() => handleRow(row)}
                                    key={row.id}
                                    className={`border-b border-gray-200 ${row.getIsSelected() ? "bg-purple-50" : ""}`}
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <td
                                            key={cell.id}
                                            className="py-1 whitespace-nowrap overflow-hidden text-ellipsis relative"
                                        >
                                            <div className="ml-2 mr-3">
                                                {flexRender(
                                                    cell.column.columnDef.cell,
                                                    cell.getContext(),
                                                )}
                                            </div>
                                            {cell.column.getCanResize() && (
                                                <div
                                                    onMouseDown={table.getHeaderGroups()[0].headers.find(h => h.column.id === cell.column.id)?.getResizeHandler()}
                                                    onTouchStart={table.getHeaderGroups()[0].headers.find(h => h.column.id === cell.column.id)?.getResizeHandler()}
                                                    className={`absolute right-0 top-0 bottom-0 w-1 cursor-col-resize select-none touch-none ${
                                                        cell.column.getIsResizing() ? 'bg-blue-500' : 'bg-gray-200'
                                                    }`}
                                                />
                                            )}
                                        </td>
                                    ))}
                                    <td>
                                        {/** DO NOT REMOVE! This is essential for blind people to select rows */}
                                        {
                                            !compareOn && (
                                                <form
                                                    onSubmit={(e) => e.preventDefault()}
                                                >
                                                    <label
                                                        htmlFor={`${row.id}-checkbox`}
                                                        className="sr-only"
                                                    >
                                                        Toggle row
                                                    </label>
                                                    <input
                                                        type="checkbox"
                                                        id={`${row.id}-checkbox`}
                                                        className="sr-only"
                                                        checked={row.getIsSelected()}
                                                        onChange={(e) => {
                                                            e.preventDefault();
                                                            handleRow(row);
                                                        }}
                                                    />
                                                </form>
                                            )
                                        }
                                    </td>
                                </tr>
                            );
                        })}
                        {paddingBottom > 0 && (
                            <tr>
                                <td
                                    style={{ height: `${paddingBottom}px` }}
                                    colSpan={
                                        table.getVisibleLeafColumns().length
                                    }
                                />
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
