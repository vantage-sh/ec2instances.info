'use client';

import { Region } from '../types';
import FilterDropdown from './FilterDropdown';
import ColumnFilter from './ColumnFilter';

interface FiltersProps {
    regions: Region;
    selectedRegion: string;
    onRegionChange: (region: string) => void;
    pricingUnit: string;
    onPricingUnitChange: (unit: string) => void;
    duration: string;
    onDurationChange: (duration: string) => void;
    reservedTerm: string;
    onReservedTermChange: (term: string) => void;
    searchTerm: string;
    onSearchTermChange: (term: string) => void;
    columnVisibility: Record<string, boolean>;
    onColumnVisibilityChange: (key: string, visible: boolean) => void;
}

export default function Filters({
    regions,
    selectedRegion,
    onRegionChange,
    pricingUnit,
    onPricingUnitChange,
    duration,
    onDurationChange,
    reservedTerm,
    onReservedTermChange,
    searchTerm,
    onSearchTermChange,
    columnVisibility,
    onColumnVisibilityChange,
}: FiltersProps) {
    const regionOptions = Object.entries(regions.main).map(([code, name]) => ({
        value: code,
        label: name,
        group: 'Main Regions',
    }));

    const localZoneOptions = Object.entries(regions.local_zone).map(([code, name]) => ({
        value: code,
        label: name,
        group: 'Local Zones',
    }));

    const wavelengthOptions = Object.entries(regions.wavelength).map(([code, name]) => ({
        value: code,
        label: name,
        group: 'Wavelength Zones',
    }));

    const pricingUnitOptions = [
        { value: 'instance', label: 'Instance' },
        { value: 'vcpu', label: 'vCPU' },
        { value: 'ecu', label: 'ECU' },
        { value: 'memory', label: 'Memory' },
    ];

    const durationOptions = [
        { value: 'secondly', label: 'Per Second' },
        { value: 'minutely', label: 'Per Minute' },
        { value: 'hourly', label: 'Hourly' },
        { value: 'daily', label: 'Daily' },
        { value: 'weekly', label: 'Weekly' },
        { value: 'monthly', label: 'Monthly' },
        { value: 'annually', label: 'Annually' },
    ];

    const reservedTermOptions = [
        { value: 'yrTerm1Standard.noUpfront', label: '1-year - No Upfront' },
        { value: 'yrTerm1Standard.partialUpfront', label: '1-year - Partial Upfront' },
        { value: 'yrTerm1Standard.allUpfront', label: '1-year - Full Upfront' },
        { value: 'yrTerm3Standard.noUpfront', label: '3-year - No Upfront' },
        { value: 'yrTerm3Standard.partialUpfront', label: '3-year - Partial Upfront' },
        { value: 'yrTerm3Standard.allUpfront', label: '3-year - Full Upfront' },
        { value: 'yrTerm1Convertible.noUpfront', label: '1-year convertible - No Upfront' },
        { value: 'yrTerm1Convertible.partialUpfront', label: '1-year convertible - Partial Upfront' },
        { value: 'yrTerm1Convertible.allUpfront', label: '1-year convertible - Full Upfront' },
        { value: 'yrTerm3Convertible.noUpfront', label: '3-year convertible - No Upfront' },
        { value: 'yrTerm3Convertible.partialUpfront', label: '3-year convertible - Partial Upfront' },
        { value: 'yrTerm3Convertible.allUpfront', label: '3-year convertible - Full Upfront' },
    ];

    const columnOptions = [
        { key: 'pretty_name', label: 'Name', visible: columnVisibility.pretty_name },
        { key: 'instance_type', label: 'API Name', visible: columnVisibility.instance_type },
        { key: 'family', label: 'Instance Family', visible: columnVisibility.family },
        { key: 'memory', label: 'Memory', visible: columnVisibility.memory },
        { key: 'ECU', label: 'Compute Units (ECU)', visible: columnVisibility.ECU },
        { key: 'vCPU', label: 'vCPUs', visible: columnVisibility.vCPU },
        { key: 'memory_per_vcpu', label: 'GiB of Memory per vCPU', visible: columnVisibility.memory_per_vcpu },
        { key: 'GPU', label: 'GPUs', visible: columnVisibility.GPU },
        { key: 'GPU_model', label: 'GPU model', visible: columnVisibility.GPU_model },
        { key: 'GPU_memory', label: 'GPU memory', visible: columnVisibility.GPU_memory },
        { key: 'compute_capability', label: 'CUDA Compute Capability', visible: columnVisibility.compute_capability },
        { key: 'FPGA', label: 'FPGAs', visible: columnVisibility.FPGA },
        { key: 'ECU_per_vcpu', label: 'ECU per vCPU', visible: columnVisibility.ECU_per_vcpu },
        { key: 'physical_processor', label: 'Physical Processor', visible: columnVisibility.physical_processor },
        { key: 'clock_speed_ghz', label: 'Clock Speed(GHz)', visible: columnVisibility.clock_speed_ghz },
        { key: 'intel_avx', label: 'Intel AVX', visible: columnVisibility.intel_avx },
        { key: 'intel_avx2', label: 'Intel AVX2', visible: columnVisibility.intel_avx2 },
        { key: 'intel_avx512', label: 'Intel AVX-512', visible: columnVisibility.intel_avx512 },
        { key: 'intel_turbo', label: 'Intel Turbo', visible: columnVisibility.intel_turbo },
        { key: 'storage', label: 'Instance Storage', visible: columnVisibility.storage },
        { key: 'warmed-up', label: 'Instance Storage: already warmed-up', visible: columnVisibility['warmed-up'] },
        { key: 'trim-support', label: 'Instance Storage: SSD TRIM Support', visible: columnVisibility['trim-support'] },
        { key: 'arch', label: 'Arch', visible: columnVisibility.arch },
        { key: 'network_performance', label: 'Network Performance', visible: columnVisibility.network_performance },
        { key: 'ebs_baseline_bandwidth', label: 'EBS Optimized: Baseline Bandwidth', visible: columnVisibility.ebs_baseline_bandwidth },
        { key: 'ebs_baseline_throughput', label: 'EBS Optimized: Baseline Throughput (128K)', visible: columnVisibility.ebs_baseline_throughput },
        { key: 'ebs_baseline_iops', label: 'EBS Optimized: Baseline IOPS (16K)', visible: columnVisibility.ebs_baseline_iops },
        { key: 'ebs_max_bandwidth', label: 'EBS Optimized: Max Bandwidth', visible: columnVisibility.ebs_max_bandwidth },
        { key: 'ebs_throughput', label: 'EBS Optimized: Max Throughput (128K)', visible: columnVisibility.ebs_throughput },
        { key: 'ebs_iops', label: 'EBS Optimized: Max IOPS (16K)', visible: columnVisibility.ebs_iops },
        { key: 'ebs_as_nvme', label: 'EBS Exposed as NVMe', visible: columnVisibility.ebs_as_nvme },
        { key: 'maxips', label: 'Max IPs', visible: columnVisibility.maxips },
        { key: 'maxenis', label: 'Max ENIs', visible: columnVisibility.maxenis },
        { key: 'enhanced_networking', label: 'Enhanced Networking', visible: columnVisibility.enhanced_networking },
        { key: 'vpc_only', label: 'VPC Only', visible: columnVisibility.vpc_only },
        { key: 'ipv6_support', label: 'IPv6 Support', visible: columnVisibility.ipv6_support },
        { key: 'placement_group_support', label: 'Placement Group Support', visible: columnVisibility.placement_group_support },
        { key: 'linux_virtualization_types', label: 'Linux Virtualization', visible: columnVisibility.linux_virtualization_types },
        { key: 'emr', label: 'On EMR', visible: columnVisibility.emr },
        { key: 'availability_zones', label: 'Availability Zones', visible: columnVisibility.availability_zones },
        { key: 'cost-ondemand', label: 'On Demand', visible: columnVisibility['cost-ondemand'] },
        { key: 'cost-reserved', label: 'Linux Reserved cost', visible: columnVisibility['cost-reserved'] },
        { key: 'cost-spot-min', label: 'Linux Spot Minimum cost', visible: columnVisibility['cost-spot-min'] },
        { key: 'cost-spot-max', label: 'Linux Spot Average cost', visible: columnVisibility['cost-spot-max'] },
        { key: 'cost-ondemand-rhel', label: 'RHEL On Demand cost', visible: columnVisibility['cost-ondemand-rhel'] },
        { key: 'cost-reserved-rhel', label: 'RHEL Reserved cost', visible: columnVisibility['cost-reserved-rhel'] },
        { key: 'cost-spot-min-rhel', label: 'RHEL Spot Minimum cost', visible: columnVisibility['cost-spot-min-rhel'] },
        { key: 'cost-spot-max-rhel', label: 'RHEL Spot Maximum cost', visible: columnVisibility['cost-spot-max-rhel'] },
        { key: 'cost-ondemand-sles', label: 'SLES On Demand cost', visible: columnVisibility['cost-ondemand-sles'] },
        { key: 'cost-reserved-sles', label: 'SLES Reserved cost', visible: columnVisibility['cost-reserved-sles'] },
        { key: 'cost-spot-min-sles', label: 'SLES Spot Minimum cost', visible: columnVisibility['cost-spot-min-sles'] },
        { key: 'cost-spot-max-sles', label: 'SLES Spot Maximum cost', visible: columnVisibility['cost-spot-max-sles'] },
        { key: 'cost-ondemand-mswin', label: 'Windows On Demand cost', visible: columnVisibility['cost-ondemand-mswin'] },
        { key: 'cost-reserved-mswin', label: 'Windows Reserved cost', visible: columnVisibility['cost-reserved-mswin'] },
        { key: 'cost-spot-min-mswin', label: 'Windows Spot Minimum cost', visible: columnVisibility['cost-spot-min-mswin'] },
        { key: 'cost-spot-max-mswin', label: 'Windows Spot Average cost', visible: columnVisibility['cost-spot-max-mswin'] },
        { key: 'cost-ondemand-dedicated', label: 'Dedicated Host On Demand', visible: columnVisibility['cost-ondemand-dedicated'] },
        { key: 'cost-reserved-dedicated', label: 'Dedicated Host Reserved', visible: columnVisibility['cost-reserved-dedicated'] },
        { key: 'cost-ondemand-mswinSQLWeb', label: 'Windows SQL Web On Demand cost', visible: columnVisibility['cost-ondemand-mswinSQLWeb'] },
        { key: 'cost-reserved-mswinSQLWeb', label: 'Windows SQL Web Reserved cost', visible: columnVisibility['cost-reserved-mswinSQLWeb'] },
        { key: 'cost-ondemand-mswinSQL', label: 'Windows SQL Std On Demand cost', visible: columnVisibility['cost-ondemand-mswinSQL'] },
        { key: 'cost-reserved-mswinSQL', label: 'Windows SQL Std Reserved cost', visible: columnVisibility['cost-reserved-mswinSQL'] },
        { key: 'cost-ondemand-mswinSQLEnterprise', label: 'Windows SQL Ent On Demand cost', visible: columnVisibility['cost-ondemand-mswinSQLEnterprise'] },
        { key: 'cost-reserved-mswinSQLEnterprise', label: 'Windows SQL Ent Reserved cost', visible: columnVisibility['cost-reserved-mswinSQLEnterprise'] },
        { key: 'cost-ondemand-linuxSQLWeb', label: 'Linux SQL Web On Demand cost', visible: columnVisibility['cost-ondemand-linuxSQLWeb'] },
        { key: 'cost-reserved-linuxSQLWeb', label: 'Linux SQL Web Reserved cost', visible: columnVisibility['cost-reserved-linuxSQLWeb'] },
        { key: 'cost-ondemand-linuxSQL', label: 'Linux SQL Std On Demand cost', visible: columnVisibility['cost-ondemand-linuxSQL'] },
        { key: 'cost-reserved-linuxSQL', label: 'Linux SQL Std Reserved cost', visible: columnVisibility['cost-reserved-linuxSQL'] },
        { key: 'cost-ondemand-linuxSQLEnterprise', label: 'Linux SQL Ent On Demand cost', visible: columnVisibility['cost-ondemand-linuxSQLEnterprise'] },
        { key: 'cost-reserved-linuxSQLEnterprise', label: 'Linux SQL Ent Reserved cost', visible: columnVisibility['cost-reserved-linuxSQLEnterprise'] },
        { key: 'spot-interrupt-rate', label: 'Linux Spot Interrupt Frequency', visible: columnVisibility['spot-interrupt-rate'] },
        { key: 'cost-emr', label: 'EMR cost', visible: columnVisibility['cost-emr'] },
        { key: 'generation', label: 'Generation', visible: columnVisibility.generation }
    ];

    return (
        <div className="m-2 d-flex justify-content-between align-items-end" id="menu">
            <div className="d-flex align-items-md-end gap-md-4 gap-3 flex-md-row flex-column">
                <div className="d-flex gap-3">
                    <FilterDropdown
                        label="Region"
                        value={selectedRegion}
                        onChange={onRegionChange}
                        options={[...regionOptions, ...localZoneOptions, ...wavelengthOptions]}
                    />
                    <FilterDropdown
                        label="Pricing Unit"
                        value={pricingUnit}
                        onChange={onPricingUnitChange}
                        options={pricingUnitOptions}
                        icon="shopping-cart"
                    />
                    <FilterDropdown
                        label="Cost"
                        value={duration}
                        onChange={onDurationChange}
                        options={durationOptions}
                        icon="shopping-cart"
                    />
                    <FilterDropdown
                        label="Reserved"
                        value={reservedTerm}
                        onChange={onReservedTermChange}
                        options={reservedTermOptions}
                        icon="globe"
                    />
                    <ColumnFilter
                        columns={columnOptions}
                        onColumnVisibilityChange={onColumnVisibilityChange}
                    />
                </div>
                <div className="d-flex gap-2">
                    <button className="btn btn-purple btn-compare">
                        Compare
                    </button>
                    <button className="btn btn-outline-secondary btn-clear">
                        Clear Filters
                    </button>
                </div>
            </div>
            <div className="d-flex gap-2">
                <button className="btn btn-outline-secondary btn-primary" id="export">
                    Export
                </button>
                <div className="btn-group-vertical" id="search">
                    <div className="block my-auto h-max">
                        <input
                            id="fullsearch"
                            type="text"
                            className="form-control d-none d-xl-block"
                            placeholder="Search..."
                            value={searchTerm}
                            onChange={(e) => onSearchTermChange(e.target.value)}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
} 