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
    RowSelectionState,
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
    useCompareOn,
} from "@/state";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
    SetStateAction,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import IndividualColumnFilter from "./IndividualColumnFilter";
import columnsGen from "./columns";
import SortToggle from "./SortToggle";

interface InstanceTableProps {
    instances: Instance[];
    rowSelection: RowSelectionState;
    setRowSelection: (value: SetStateAction<RowSelectionState>) => void;
    instanceCount: number;
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

export default function InstanceTable({
    instances,
    rowSelection,
    setRowSelection,
    instanceCount,
}: InstanceTableProps) {
    const columnVisibility = columnVisibilityAtom.use();
    const [searchTerm] = useSearchTerm();
    const [selectedRegion] = useSelectedRegion();
    const [pricingUnit] = usePricingUnit();
    const [costDuration] = useDuration();
    const [reservedTerm] = useReservedTerm();
    const [gSettings, gSettingsFullMutations] = useGSettings();
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
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

    const columns = columnsGen(
        selectedRegion,
        pricingUnit,
        costDuration,
        reservedTerm,
    );

    const data = useMemo(() => {
        if (compareOn && gSettings) {
            const selectedInstances = gSettings.filter.split("|");
            return instances.filter((i) =>
                selectedInstances.includes(i.instance_type),
            );
        }
        return instances;
    }, [compareOn, gSettingsFullMutations, instances]);

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
        onRowSelectionChange: setRowSelection,
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
        estimateSize: () => 33.3,
        measureElement: (element) => element.getBoundingClientRect().height,
        overscan: 10,
    });

    const virtualRows = rowVirtualizer.getVirtualItems();
    let totalHeight = rowVirtualizer.getTotalSize();
    if (instances.length < instanceCount && !compareOn) {
        // Add padding to the table to account for the missing instances.
        totalHeight += (totalHeight / instances.length) * (instanceCount - instances.length);
    }
    const paddingTop = virtualRows.length > 0 ? virtualRows[0].start : 0;
    const paddingBottom =
        virtualRows.length > 0
            ? totalHeight - virtualRows[virtualRows.length - 1].end
            : 0;

    // Handle synchronising the rows with the global settings.
    useEffect(() => {
        if (!gSettings) return;
        const selectedInstances = compareOn
            ? gSettings.filter.split("|")
            : gSettings.selected;
        for (const row of rows) {
            row.toggleSelected(
                selectedInstances.includes(row.original.instance_type),
            );
        }
    }, [gSettingsFullMutations, rows, compareOn]);

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
                {/* MOVE CLASSES TO GLOBAL CSS */}
                <table className="index-table">
                    <colgroup>
                        {table.getVisibleLeafColumns().map((column) => (
                            <col
                                key={column.id}
                                style={{ width: `${column.getSize()}px` }}
                            />
                        ))}
                    </colgroup>
                    <thead>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <tr key={headerGroup.id}>
                                {headerGroup.headers.map((header) => (
                                    <th key={header.id}>
                                        <div className="mx-2 mt-2 flex items-center justify-between">
                                            <span
                                                className="cursor-pointer select-none"
                                                onClick={() =>
                                                    setSorting((old) => [
                                                        {
                                                            id: header.id,
                                                            desc:
                                                                old.find(
                                                                    (s) =>
                                                                        s.id ===
                                                                        header.id,
                                                                )?.desc ===
                                                                false,
                                                        },
                                                    ])
                                                }
                                            >
                                                {flexRender(
                                                    header.column.columnDef
                                                        .header,
                                                    header.getContext(),
                                                )}
                                            </span>
                                            <SortToggle
                                                value={
                                                    sorting.find(
                                                        (s) =>
                                                            s.id === header.id,
                                                    )?.desc
                                                }
                                                setValue={(value) =>
                                                    setSorting((old) => {
                                                        const inside = old.find(
                                                            (s) =>
                                                                s.id ===
                                                                header.id,
                                                        );
                                                        if (
                                                            inside?.desc ===
                                                            value
                                                        ) {
                                                            // Remove the sorting if it's already set.
                                                            return old.filter(
                                                                (s) =>
                                                                    s.id !==
                                                                    header.id,
                                                            );
                                                        }
                                                        if (inside) {
                                                            return old.map(
                                                                (s) =>
                                                                    s.id ===
                                                                    header.id
                                                                        ? {
                                                                              ...s,
                                                                              desc: value,
                                                                          }
                                                                        : s,
                                                            );
                                                        }
                                                        return [
                                                            ...old,
                                                            {
                                                                id: header.id,
                                                                desc: value,
                                                            },
                                                        ];
                                                    })
                                                }
                                            />
                                        </div>
                                        {header.column.getCanFilter() &&
                                            !compareOn && (
                                                <div className="mt-2 mb-2 ml-2 mr-3">
                                                    <IndividualColumnFilter
                                                        gSettings={gSettings}
                                                        gSettingsFullMutations={
                                                            gSettingsFullMutations
                                                        }
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
                    <tbody ref={tableBodyRef}>
                        <tr className="resize-row">
                            {table
                                .getHeaderGroups()[0]
                                .headers.map((header) => (
                                    <td key={header.id}>
                                        <div
                                            onMouseDown={header.getResizeHandler()}
                                            onTouchStart={header.getResizeHandler()}
                                            style={{
                                                height: `${totalHeight}px`,
                                            }}
                                            className="absolute z-10 right-0 w-1 cursor-col-resize select-none touch-none hover:bg-gray-100 active:bg-blue-200"
                                        />
                                    </td>
                                ))}
                        </tr>
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
                                    className={` ${row.getIsSelected() ? "bg-purple-50" : ""}`}
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <td key={cell.id}>
                                            {flexRender(
                                                cell.column.columnDef.cell,
                                                cell.getContext(),
                                            )}
                                        </td>
                                    ))}
                                    <td>
                                        {/** DO NOT REMOVE! This is essential for blind people to select rows */}
                                        {!compareOn && (
                                            <form
                                                onSubmit={(e) =>
                                                    e.preventDefault()
                                                }
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
                                        )}
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
