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
    callCsvExportEvents,
    callMdExportEvents,
    clearGSettings,
    useCompareOn,
    columnVisibilityAtoms,
} from "@/state";
import { pricingUnitOptions, durationOptions } from "@/utils/dataMappings";
import { useMemo } from "react";
import { RowSelectionState } from "@tanstack/react-table";
import * as columnData from "@/utils/colunnData";

interface FiltersProps<DataKey extends keyof typeof columnData> {
    regions: Region;
    rowSelection: RowSelectionState;
    columnAtomKey: DataKey;
    reservedTermOptions: {
        value: string;
        label: string;
    }[];
    ecuRename?: string;
    reservedLabel?: string;
}

export default function Filters<DataKey extends keyof typeof columnData>({
    regions,
    rowSelection,
    columnAtomKey,
    ecuRename,
    reservedTermOptions,
    reservedLabel,
}: FiltersProps<DataKey>) {
    const columnVisibility = columnVisibilityAtoms[columnAtomKey].use();
    const [searchTerm, setSearchTerm] = useSearchTerm();
    const [selectedRegion, setSelectedRegion] = useSelectedRegion();
    const [pricingUnit, setPricingUnit] = usePricingUnit(ecuRename);
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
                defaultVisible:
                    columnData[columnAtomKey].initialColumnsValue[key],
            };
        }
        // @ts-expect-error: TS doesn't like this for some reason.
        return columnData[columnAtomKey].makePrettyNames(makeColumnOption);
    }, Object.values(columnVisibility));

    let pricingUnitOptionsCpy = pricingUnitOptions;
    if (ecuRename) {
        pricingUnitOptionsCpy = [...pricingUnitOptionsCpy];
        for (const option of pricingUnitOptionsCpy) {
            if (option.value === "ecu") {
                option.label = ecuRename;
                break;
            }
        }
    }

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
                        options={pricingUnitOptionsCpy}
                    />
                    <FilterDropdown
                        label="Cost"
                        value={duration}
                        onChange={(v) => setDuration(v as CostDuration)}
                        options={durationOptions}
                    />
                    <FilterDropdown
                        label={reservedLabel ?? "Reserved"}
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
                <div className="d-flex gap-1 my-auto">
                    <button
                        className="text-sm m-1 px-2 py-2 h-max border border-gray-300 rounded-md cursor-pointer font-semibold"
                        onClick={callCsvExportEvents}
                    >
                        Export CSV
                    </button>
                    <button
                        className="text-sm m-1 px-2 py-2 h-max border border-gray-300 rounded-md cursor-pointer font-semibold"
                        onClick={callMdExportEvents}
                    >
                        Export MD
                    </button>
                </div>
                <div className="my-auto" id="search">
                    <div className="block">
                        <input
                            id="fullsearch"
                            type="text"
                            className="form-control not-xl:hidden not-2xl:w-25 p-1 border-gray-300 border rounded-md"
                            placeholder="Search..."
                            value={compareOn ? valuePreCompareOn : searchTerm}
                            disabled={compareOn}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
