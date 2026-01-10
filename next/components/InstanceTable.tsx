"use client";

import {
    useReactTable,
    getCoreRowModel,
    getFilteredRowModel,
    flexRender,
    Row,
    getSortedRowModel,
    RowSelectionState,
    ColumnDef,
    Updater,
} from "@tanstack/react-table";
import {
    useSearchTerm,
    useSelectedRegion,
    useReservedTerm,
    useActiveTableDataFormatter,
    usePricingUnit,
    useDuration,
    useCompareOn,
    useColumnVisibility,
    useSorting,
    useColumnFilters,
    useSelected,
    useCurrency,
    currencyRateAtom,
} from "@/state";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useCallback, useMemo, useRef } from "react";
import IndividualColumnFilter from "./IndividualColumnFilter";
import SortToggle from "./SortToggle";
import * as columnData from "@/utils/colunnData";
import { usePathname } from "next/navigation";
import DragDetector from "./DragDetector";

export type AtomKeyWhereInstanceIs<Instance> = {
    [AtomKey in keyof typeof columnData]: (typeof columnData)[AtomKey]["columnsGen"] extends (
        ...args: any[]
    ) => ColumnDef<Instance>[]
        ? AtomKey
        : never;
}[keyof typeof columnData];

interface InstanceTableProps<Instance> {
    instances: Instance[];
    instanceCount: number;
    columnAtomKey: AtomKeyWhereInstanceIs<Instance>;
    ecuRename?: string;
}

const regexCache = new Map<string, RegExp>();
function getRegex(value: string) {
    let regex = regexCache.get(value);
    if (!regex) {
        regex = new RegExp(value, "ig");
        regexCache.set(value, regex);
    }
    regex.lastIndex = 0;
    return regex;
}

function Cell({ cell }: { cell: any }) {
    let child: any;
    if (typeof cell.column.columnDef.cell === "function") {
        child = cell.column.columnDef.cell(cell.getContext());
    } else {
        child = cell.column.columnDef.cell;
    }

    if (child === null || child === undefined || child === "") {
        return <td>-</td>;
    }

    return <td>{child}</td>;
}

export default function InstanceTable<
    Instance extends { instance_type: string },
>({
    instances,
    instanceCount,
    columnAtomKey,
    ecuRename,
}: InstanceTableProps<Instance>) {
    const pathname = usePathname();
    const [columnVisibilityState] = useColumnVisibility(pathname);
    const [searchTerm] = useSearchTerm(pathname);
    const [selectedRegion] = useSelectedRegion(pathname);
    const [pricingUnit] = usePricingUnit(pathname, ecuRename);
    const [costDuration] = useDuration(pathname);
    const [reservedTerm] = useReservedTerm(pathname);
    const [columnFilters, setColumnFilters] = useColumnFilters(pathname);
    const [compareOn] = useCompareOn(pathname);
    const [selected, setSelected] = useSelected(pathname);
    const [sorting, setSorting] = useSorting(pathname);
    const [currency] = useCurrency(pathname);
    const conversionRate = currencyRateAtom.use();

    const columns = columnData[columnAtomKey].columnsGen(
        selectedRegion,
        pricingUnit,
        costDuration,
        reservedTerm,
        {
            code: currency,
            usdRate: conversionRate.usd,
            cnyRate: conversionRate.cny,
        },
    );
    for (const col of columns) {
        col.sortUndefined = "last";
    }

    const columnVisibility = useMemo(() => {
        // Merge the state with the default values.
        const res = { ...columnData[columnAtomKey].initialColumnsValue };
        for (const key in columnVisibilityState) {
            res[key as keyof typeof res] = columnVisibilityState[key];
        }
        return res;
    }, [columnAtomKey, columnVisibilityState]);

    const data = useMemo(() => {
        if (compareOn) {
            return instances.filter((i) => selected.includes(i.instance_type));
        }
        return instances;
    }, [compareOn, instances, selected]);

    const rowSelectionRemapped = useMemo(() => {
        const res: RowSelectionState = {};
        for (const instance of selected) {
            res[instance] = true;
        }
        return res;
    }, [selected]);

    const table = useReactTable({
        data,
        getRowId: (row) => row.instance_type,
        columns: columns as ColumnDef<Instance, any>[],
        globalFilterFn: (row, columnId, filterValue) => {
            const column = `${row.getValue(columnId)}`;
            try {
                const regex = getRegex(filterValue);
                const v = regex.test(column);
                return !!v;
            } catch {}
            return column.toLowerCase().includes(filterValue.toLowerCase());
        },
        state: {
            columnVisibility,
            globalFilter: searchTerm,
            columnFilters: columnFilters,
            sorting,
            rowSelection: rowSelectionRemapped,
        },
        defaultColumn: {
            size: 200,
            minSize: 50,
            maxSize: 500,
        },
        enableFilters: true,
        onColumnFiltersChange: setColumnFilters,
        onRowSelectionChange: useCallback(
            (updater: Updater<RowSelectionState>) => {
                if (typeof updater === "function") {
                    const obj = updater(rowSelectionRemapped);
                    setSelected(Object.keys(obj).filter((k) => obj[k]));
                } else {
                    setSelected(Object.keys(updater).filter((k) => updater[k]));
                }
            },
            [selected, rowSelectionRemapped],
        ),
        enableMultiRowSelection: true,
        columnResizeMode: "onChange",
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getSortedRowModel: getSortedRowModel(),
    });

    useActiveTableDataFormatter(async () => {
        const rows: string[][] = [];
        for (const header of table.getHeaderGroups()) {
            rows.push(
                header.headers.map(
                    (h) => h.getContext().column.columnDef.header as string,
                ),
            );
        }
        const { renderToString } = await import("react-dom/server");
        const el = document.createElement("div");
        for (const row of table.getRowModel().rows) {
            rows.push(
                row.getVisibleCells().map((c) => {
                    const v = renderToString(
                        flexRender(c.column.columnDef.cell, c.getContext()),
                    );
                    el.innerHTML = v;
                    return el.textContent ?? "";
                }),
            );
        }
        return rows;
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
        totalHeight +=
            (totalHeight / instances.length) *
                (instanceCount - instances.length) +
            79;
    }
    const paddingTop = virtualRows.length > 0 ? virtualRows[0].start : 0;
    const paddingBottom =
        virtualRows.length > 0
            ? totalHeight - virtualRows[virtualRows.length - 1].end
            : 0;

    const handleRow = useCallback(
        (row: Row<Instance>) => {
            if (compareOn) return;
            row.toggleSelected();
        },
        [compareOn],
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
                                        <div className="relative overflow-hidden border-y border-r border-gray-3 bg-gray-4">
                                            <span
                                                className="block w-full h-[70px] px-2 pt-1 pr-5 cursor-pointer select-none overflow-hidden whitespace-nowrap text-ellipsis text-left flex-1 hover:bg-gray-3"
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
                                                        return [
                                                            {
                                                                id: header.id,
                                                                desc: value,
                                                            },
                                                        ];
                                                    })
                                                }
                                            />
                                            {header.column.getCanFilter() && (
                                                <div className="absolute bottom-2 left-2 right-2">
                                                    <IndividualColumnFilter
                                                        column={header.column}
                                                    />
                                                </div>
                                            )}
                                        </div>
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
                                            className="absolute z-20 top-[-79px] right-0 w-1 cursor-col-resize select-none touch-none hover:bg-gray-200 dark:hover:bg-gray-700 active:bg-blue-200 dark:active:bg-blue-800"
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
                                <DragDetector
                                    onNotDrag={() => handleRow(row)}
                                    key={row.id}
                                    className={` ${
                                        row.getIsSelected()
                                            ? "row-selected"
                                            : ""
                                    }`}
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <Cell key={cell.id} cell={cell} />
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
                                </DragDetector>
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
