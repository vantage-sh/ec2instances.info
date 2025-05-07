"use client";

import { CostDuration, PricingUnit, Region } from "@/types";
import FilterDropdown from "./FilterDropdown";
import ColumnFilter from "./ColumnFilter";
import {
    useSearchTerm,
    useSelectedRegion,
    usePricingUnit,
    useDuration,
    useReservedTerm,
    callExportEvents,
    clearGSettings,
    useCompareOn,
    columnVisibilityAtoms,
} from "@/state";
import {
    pricingUnitOptions,
    durationOptions,
    reservedTermOptions,
} from "@/utils/dataMappings";
import { useMemo } from "react";
import { RowSelectionState } from "@tanstack/react-table";
import * as columnData from "@/utils/colunnData";

interface FiltersProps<DataKey extends keyof typeof columnData> {
    regions: Region;
    rowSelection: RowSelectionState;
    columnAtomKey: DataKey;
}

export default function Filters<DataKey extends keyof typeof columnData>({ regions, rowSelection, columnAtomKey }: FiltersProps<DataKey>) {
    const columnVisibility = columnVisibilityAtoms[columnAtomKey].use();
    const [searchTerm, setSearchTerm] = useSearchTerm();
    const [selectedRegion, setSelectedRegion] = useSelectedRegion();
    const [pricingUnit, setPricingUnit] = usePricingUnit();
    const [duration, setDuration] = useDuration();
    const [reservedTerm, setReservedTerm] = useReservedTerm();
    const [compareOn, valuePreCompareOn, setCompareOn] = useCompareOn();

    let anySelected = false;
    for (const key in rowSelection) {
        if (rowSelection[key]) {
            anySelected = true;
            break;
        }
    }

    const [regionOptions, localZoneOptions, wavelengthOptions] = useMemo(() => {
        const regionOptions = Object.entries(regions.main).map(
            ([code, name]) => ({
                value: code,
                label: name,
                group: "Main Regions",
            }),
        );

        const localZoneOptions = Object.entries(regions.local_zone).map(
            ([code, name]) => ({
                value: code,
                label: name,
                group: "Local Zones",
            }),
        );

        const wavelengthOptions = Object.entries(regions.wavelength).map(
            ([code, name]) => ({
                value: code,
                label: name,
                group: "Wavelength Zones",
            }),
        );

        return [regionOptions, localZoneOptions, wavelengthOptions] as const;
    }, [regions]);

    const columnOptions = useMemo(() => {
        function makeColumnOption<Key extends keyof typeof columnVisibility>(
            key: Key,
            label: string,
        ) {
            return {
                key,
                label,
                visible: columnVisibility[key],
            };
        }
        // @ts-expect-error: TS doesn't like this for some reason.
        return columnData[columnAtomKey].makePrettyNames(makeColumnOption);
    }, Object.values(columnVisibility));

    return (
        <div
            className="my-1.5 mx-2 d-flex justify-content-between align-items-end"
            id="menu"
        >
            <div className="d-flex align-items-md-end gap-md-4 gap-4 flex-md-row flex-column">
                <div className="d-flex gap-4">
                    <FilterDropdown
                        label="Region"
                        value={selectedRegion}
                        onChange={(v) => setSelectedRegion(v)}
                        options={[
                            ...regionOptions,
                            ...localZoneOptions,
                            ...wavelengthOptions,
                        ]}
                    />
                    <FilterDropdown
                        label="Pricing Unit"
                        value={pricingUnit}
                        onChange={(v) => setPricingUnit(v as PricingUnit)}
                        options={pricingUnitOptions}
                    />
                    <FilterDropdown
                        label="Cost"
                        value={duration}
                        onChange={(v) => setDuration(v as CostDuration)}
                        options={durationOptions}
                    />
                    <FilterDropdown
                        label="Reserved"
                        value={reservedTerm}
                        onChange={(v) => setReservedTerm(v)}
                        options={reservedTermOptions}
                    />
                    <ColumnFilter<DataKey>
                        // @ts-expect-error: TS doesn't like this for some reason.
                        columns={columnOptions}
                        onColumnVisibilityChange={(k, v) => {
                            columnVisibilityAtoms[columnAtomKey].mutate((o) => {
                                // @ts-expect-error: We know this is a valid key.
                                o[k] = v;
                            });
                        }}
                    />
                </div>
                <div className="d-flex gap-2">
                    {compareOn ? (
                        <button
                            className="btn bg-red-600 text-white"
                            onClick={() => setCompareOn(false)}
                        >
                            End Compare
                        </button>
                    ) : (
                        <button
                            disabled={!anySelected}
                            className="btn btn-purple btn-compare disabled:opacity-50 self-end"
                            onClick={() => setCompareOn(true)}
                        >
                            Compare
                        </button>
                    )}
                    <button
                        className="btn text-sm btn-outline-secondary btn-clear self-end"
                        onClick={clearGSettings}
                    >
                        Clear Filters
                    </button>
                </div>
            </div>
            <div className="d-flex gap-2">
                <button
                    className="btn btn-outline-secondary btn-primary"
                    onClick={callExportEvents}
                >
                    Export
                </button>
                <div className="my-auto" id="search">
                    <div className="block">
                        <input
                            id="fullsearch"
                            type="text"
                            className="form-control not-xl:hidden p-1 border-gray-300 border rounded-md"
                            placeholder="Search..."
                            value={
                                compareOn
                                    ? valuePreCompareOn
                                    : searchTerm
                            }
                            disabled={compareOn}
                            onChange={(e) =>
                                setSearchTerm(e.target.value)
                            }
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
