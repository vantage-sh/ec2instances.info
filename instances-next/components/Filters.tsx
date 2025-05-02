"use client";

import { CostDuration, PricingUnit, Region } from "@/types";
import FilterDropdown from "./FilterDropdown";
import ColumnFilter from "./ColumnFilter";
import {
    columnVisibilityAtom,
    useSearchTerm,
    useSelectedRegion,
    usePricingUnit,
    useDuration,
    useReservedTerm,
    callExportEvents,
    clearGSettings,
    useCompareOn,
} from "@/state";
import type { ColumnVisibility } from "@/utils/columnVisibility";
import {
    pricingUnitOptions,
    durationOptions,
    reservedTermOptions,
} from "@/utils/dataMappings";
import { useMemo } from "react";
import { RowSelectionState } from "@tanstack/react-table";

interface FiltersProps {
    regions: Region;
    rowSelection: RowSelectionState;
}

export default function Filters({ regions, rowSelection }: FiltersProps) {
    const columnVisibility = columnVisibilityAtom.use();
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
        const regionOptions = Object.entries(regions.main).map(([code, name]) => ({
            value: code,
            label: name,
            group: "Main Regions",
        }));
    
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
        function makeColumnOption<K extends keyof ColumnVisibility>(
            key: K,
            label: string,
        ) {
            return {
                key,
                label,
                visible: columnVisibility[key],
            };
        }
        return [
            makeColumnOption("pretty_name", "Name"),
            makeColumnOption("instance_type", "API Name"),
            makeColumnOption("family", "Instance Family"),
            makeColumnOption("memory", "Memory"),
            makeColumnOption("ECU", "Compute Units (ECU)"),
            makeColumnOption("vCPU", "vCPUs"),
            makeColumnOption("memory_per_vcpu", "GiB of Memory per vCPU"),
            makeColumnOption("GPU", "GPUs"),
            makeColumnOption("GPU_model", "GPU model"),
            makeColumnOption("GPU_memory", "GPU memory"),
            makeColumnOption("compute_capability", "CUDA Compute Capability"),
            makeColumnOption("FPGA", "FPGAs"),
            makeColumnOption("ECU_per_vcpu", "ECU per vCPU"),
            makeColumnOption("physical_processor", "Physical Processor"),
            makeColumnOption("clock_speed_ghz", "Clock Speed(GHz)"),
            makeColumnOption("intel_avx", "Intel AVX"),
            makeColumnOption("intel_avx2", "Intel AVX2"),
            makeColumnOption("intel_avx512", "Intel AVX-512"),
            makeColumnOption("intel_turbo", "Intel Turbo"),
            makeColumnOption("storage", "Instance Storage"),
            makeColumnOption("warmed-up", "Instance Storage: already warmed-up"),
            makeColumnOption("trim-support", "Instance Storage: SSD TRIM Support"),
            makeColumnOption("arch", "Arch"),
            makeColumnOption("network_performance", "Network Performance"),
            makeColumnOption(
                "ebs_baseline_bandwidth",
                "EBS Optimized: Baseline Bandwidth",
            ),
            makeColumnOption(
                "ebs_baseline_throughput",
                "EBS Optimized: Baseline Throughput (128K)",
            ),
            makeColumnOption(
                "ebs_baseline_iops",
                "EBS Optimized: Baseline IOPS (16K)",
            ),
            makeColumnOption("ebs_max_bandwidth", "EBS Optimized: Max Bandwidth"),
            makeColumnOption(
                "ebs_throughput",
                "EBS Optimized: Max Throughput (128K)",
            ),
            makeColumnOption("ebs_iops", "EBS Optimized: Max IOPS (16K)"),
            makeColumnOption("ebs_as_nvme", "EBS Exposed as NVMe"),
            makeColumnOption("maxips", "Max IPs"),
            makeColumnOption("maxenis", "Max ENIs"),
            makeColumnOption("enhanced_networking", "Enhanced Networking"),
            makeColumnOption("vpc_only", "VPC Only"),
            makeColumnOption("ipv6_support", "IPv6 Support"),
            makeColumnOption("placement_group_support", "Placement Group Support"),
            makeColumnOption("linux_virtualization_types", "Linux Virtualization"),
            makeColumnOption("emr", "On EMR"),
            makeColumnOption("availability_zones", "Availability Zones"),
            makeColumnOption("cost-ondemand", "On Demand"),
            makeColumnOption("cost-reserved", "Linux Reserved cost"),
            makeColumnOption("cost-spot-min", "Linux Spot Minimum cost"),
            makeColumnOption("cost-spot-max", "Linux Spot Average cost"),
            makeColumnOption("cost-ondemand-rhel", "RHEL On Demand cost"),
            makeColumnOption("cost-reserved-rhel", "RHEL Reserved cost"),
            makeColumnOption("cost-spot-min-rhel", "RHEL Spot Minimum cost"),
            makeColumnOption("cost-spot-max-rhel", "RHEL Spot Maximum cost"),
            makeColumnOption("cost-ondemand-sles", "SLES On Demand cost"),
            makeColumnOption("cost-reserved-sles", "SLES Reserved cost"),
            makeColumnOption("cost-spot-min-sles", "SLES Spot Minimum cost"),
            makeColumnOption("cost-spot-max-sles", "SLES Spot Maximum cost"),
            makeColumnOption("cost-ondemand-mswin", "Windows On Demand cost"),
            makeColumnOption("cost-reserved-mswin", "Windows Reserved cost"),
            makeColumnOption("cost-spot-min-mswin", "Windows Spot Minimum cost"),
            makeColumnOption("cost-spot-max-mswin", "Windows Spot Average cost"),
            makeColumnOption("cost-ondemand-dedicated", "Dedicated Host On Demand"),
            makeColumnOption("cost-reserved-dedicated", "Dedicated Host Reserved"),
            makeColumnOption(
                "cost-ondemand-mswinSQLWeb",
                "Windows SQL Web On Demand cost",
            ),
            makeColumnOption(
                "cost-reserved-mswinSQLWeb",
                "Windows SQL Web Reserved cost",
            ),
            makeColumnOption(
                "cost-ondemand-mswinSQL",
                "Windows SQL Std On Demand cost",
            ),
            makeColumnOption(
                "cost-reserved-mswinSQL",
                "Windows SQL Std Reserved cost",
            ),
            makeColumnOption(
                "cost-ondemand-mswinSQLEnterprise",
                "Windows SQL Ent On Demand cost",
            ),
            makeColumnOption(
                "cost-reserved-mswinSQLEnterprise",
                "Windows SQL Ent Reserved cost",
            ),
            makeColumnOption(
                "cost-ondemand-linuxSQLWeb",
                "Linux SQL Web On Demand cost",
            ),
            makeColumnOption(
                "cost-reserved-linuxSQLWeb",
                "Linux SQL Web Reserved cost",
            ),
            makeColumnOption(
                "cost-ondemand-linuxSQL",
                "Linux SQL Std On Demand cost",
            ),
            makeColumnOption(
                "cost-reserved-linuxSQL",
                "Linux SQL Std Reserved cost",
            ),
            makeColumnOption(
                "cost-ondemand-linuxSQLEnterprise",
                "Linux SQL Ent On Demand cost",
            ),
            makeColumnOption(
                "cost-reserved-linuxSQLEnterprise",
                "Linux SQL Ent Reserved cost",
            ),
            makeColumnOption(
                "spot-interrupt-rate",
                "Linux Spot Interrupt Frequency",
            ),
            makeColumnOption("cost-emr", "EMR cost"),
            makeColumnOption("generation", "Generation"),
        ];
    }, Object.values(columnVisibility));

    return (
        <div
            className="m-2 d-flex justify-content-between align-items-end"
            id="menu"
        >
            <div className="d-flex align-items-md-end gap-md-4 gap-3 flex-md-row flex-column">
                <div className="d-flex gap-3">
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
                        icon="shopping-cart"
                    />
                    <FilterDropdown
                        label="Cost"
                        value={duration}
                        onChange={(v) => setDuration(v as CostDuration)}
                        options={durationOptions}
                        icon="shopping-cart"
                    />
                    <FilterDropdown
                        label="Reserved"
                        value={reservedTerm}
                        onChange={(v) => setReservedTerm(v)}
                        options={reservedTermOptions}
                        icon="globe"
                    />
                    <ColumnFilter
                        columns={columnOptions}
                        onColumnVisibilityChange={(k, v) => {
                            columnVisibilityAtom.mutate((o) => {
                                o[k] = v;
                            });
                        }}
                    />
                </div>
                <div className="d-flex gap-2">
                    {
                        compareOn ? (
                            <button
                                className="btn bg-red-600 text-white"
                                onClick={() => setCompareOn(false)}
                            >
                                End Compare
                            </button>
                        ) : (
                            <button
                                disabled={!anySelected}
                                className="btn btn-purple btn-compare disabled:opacity-50"
                                onClick={() => setCompareOn(true)}
                            >
                                Compare
                            </button>
                        )
                    }
                    <button
                        className="btn btn-outline-secondary btn-clear"
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
