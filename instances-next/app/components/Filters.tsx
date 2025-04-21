'use client';

import { Region } from '../types';
import FilterDropdown from './FilterDropdown';
import ColumnFilter from './ColumnFilter';
import state from '../state';
import { ColumnVisibility } from '../columnVisibility';

interface FiltersProps {
    regions: Region;
}

export default function Filters({ regions }: FiltersProps) {
    const columnVisibility = state.columVisibility.use();
    const searchTerm = state.searchTerm.use();
    const selectedRegion = state.selectedRegion.use();
    const pricingUnit = state.pricingUnit.use();
    const duration = state.duration.use();
    const reservedTerm = state.reservedTerm.use();

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

    function makeColumnOption<K extends keyof ColumnVisibility>(key: K, label: string) {
        return {
            key,
            label,
            visible: columnVisibility[key],
        };
    }
    const columnOptions = [
        makeColumnOption('pretty_name', 'Name'),
        makeColumnOption('instance_type', 'API Name'),
        makeColumnOption('family', 'Instance Family'),
        makeColumnOption('memory', 'Memory'),
        makeColumnOption('ECU', 'Compute Units (ECU)'),
        makeColumnOption('vCPU', 'vCPUs'),
        makeColumnOption('memory_per_vcpu', 'GiB of Memory per vCPU'),
        makeColumnOption('GPU', 'GPUs'),
        makeColumnOption('GPU_model', 'GPU model'),
        makeColumnOption('GPU_memory', 'GPU memory'),
        makeColumnOption('compute_capability', 'CUDA Compute Capability'),
        makeColumnOption('FPGA', 'FPGAs'),
        makeColumnOption('ECU_per_vcpu', 'ECU per vCPU'),
        makeColumnOption('physical_processor', 'Physical Processor'),
        makeColumnOption('clock_speed_ghz', 'Clock Speed(GHz)'),
        makeColumnOption('intel_avx', 'Intel AVX'),
        makeColumnOption('intel_avx2', 'Intel AVX2'),
        makeColumnOption('intel_avx512', 'Intel AVX-512'),
        makeColumnOption('intel_turbo', 'Intel Turbo'),
        makeColumnOption('storage', 'Instance Storage'),
        makeColumnOption('warmed-up', 'Instance Storage: already warmed-up'),
        makeColumnOption('trim-support', 'Instance Storage: SSD TRIM Support'),
        makeColumnOption('arch', 'Arch'),
        makeColumnOption('network_performance', 'Network Performance'),
        makeColumnOption('ebs_baseline_bandwidth', 'EBS Optimized: Baseline Bandwidth'),
        makeColumnOption('ebs_baseline_throughput', 'EBS Optimized: Baseline Throughput (128K)'),
        makeColumnOption('ebs_baseline_iops', 'EBS Optimized: Baseline IOPS (16K)'),
        makeColumnOption('ebs_max_bandwidth', 'EBS Optimized: Max Bandwidth'),
        makeColumnOption('ebs_throughput', 'EBS Optimized: Max Throughput (128K)'),
        makeColumnOption('ebs_iops', 'EBS Optimized: Max IOPS (16K)'),
        makeColumnOption('ebs_as_nvme', 'EBS Exposed as NVMe'),
        makeColumnOption('maxips', 'Max IPs'),
        makeColumnOption('maxenis', 'Max ENIs'),
        makeColumnOption('enhanced_networking', 'Enhanced Networking'),
        makeColumnOption('vpc_only', 'VPC Only'),
        makeColumnOption('ipv6_support', 'IPv6 Support'),
        makeColumnOption('placement_group_support', 'Placement Group Support'),
        makeColumnOption('linux_virtualization_types', 'Linux Virtualization'),
        makeColumnOption('emr', 'On EMR'),
        makeColumnOption('availability_zones', 'Availability Zones'),
        makeColumnOption('cost-ondemand', 'On Demand'),
        makeColumnOption('cost-reserved', 'Linux Reserved cost'),
        makeColumnOption('cost-spot-min', 'Linux Spot Minimum cost'),
        makeColumnOption('cost-spot-max', 'Linux Spot Average cost'),
        makeColumnOption('cost-ondemand-rhel', 'RHEL On Demand cost'),
        makeColumnOption('cost-reserved-rhel', 'RHEL Reserved cost'),
        makeColumnOption('cost-spot-min-rhel', 'RHEL Spot Minimum cost'),
        makeColumnOption('cost-spot-max-rhel', 'RHEL Spot Maximum cost'),
        makeColumnOption('cost-ondemand-sles', 'SLES On Demand cost'),
        makeColumnOption('cost-reserved-sles', 'SLES Reserved cost'),
        makeColumnOption('cost-spot-min-sles', 'SLES Spot Minimum cost'),
        makeColumnOption('cost-spot-max-sles', 'SLES Spot Maximum cost'),
        makeColumnOption('cost-ondemand-mswin', 'Windows On Demand cost'),
        makeColumnOption('cost-reserved-mswin', 'Windows Reserved cost'),
        makeColumnOption('cost-spot-min-mswin', 'Windows Spot Minimum cost'),
        makeColumnOption('cost-spot-max-mswin', 'Windows Spot Average cost'),
        makeColumnOption('cost-ondemand-dedicated', 'Dedicated Host On Demand'),
        makeColumnOption('cost-reserved-dedicated', 'Dedicated Host Reserved'),
        makeColumnOption('cost-ondemand-mswinSQLWeb', 'Windows SQL Web On Demand cost'),
        makeColumnOption('cost-reserved-mswinSQLWeb', 'Windows SQL Web Reserved cost'),
        makeColumnOption('cost-ondemand-mswinSQL', 'Windows SQL Std On Demand cost'),
        makeColumnOption('cost-reserved-mswinSQL', 'Windows SQL Std Reserved cost'),
        makeColumnOption('cost-ondemand-mswinSQLEnterprise', 'Windows SQL Ent On Demand cost'),
        makeColumnOption('cost-reserved-mswinSQLEnterprise', 'Windows SQL Ent Reserved cost'),
        makeColumnOption('cost-ondemand-linuxSQLWeb', 'Linux SQL Web On Demand cost'),
        makeColumnOption('cost-reserved-linuxSQLWeb', 'Linux SQL Web Reserved cost'),
        makeColumnOption('cost-ondemand-linuxSQL', 'Linux SQL Std On Demand cost'),
        makeColumnOption('cost-reserved-linuxSQL', 'Linux SQL Std Reserved cost'),
        makeColumnOption('cost-ondemand-linuxSQLEnterprise', 'Linux SQL Ent On Demand cost'),
        makeColumnOption('cost-reserved-linuxSQLEnterprise', 'Linux SQL Ent Reserved cost'),
        makeColumnOption('spot-interrupt-rate', 'Linux Spot Interrupt Frequency'),
        makeColumnOption('cost-emr', 'EMR cost'),
        makeColumnOption('generation', 'Generation'),
    ];

    return (
        <div className="m-2 d-flex justify-content-between align-items-end" id="menu">
            <div className="d-flex align-items-md-end gap-md-4 gap-3 flex-md-row flex-column">
                <div className="d-flex gap-3">
                    <FilterDropdown
                        label="Region"
                        value={selectedRegion}
                        onChange={(v) => state.selectedRegion.set(v)}
                        options={[...regionOptions, ...localZoneOptions, ...wavelengthOptions]}
                    />
                    <FilterDropdown
                        label="Pricing Unit"
                        value={pricingUnit}
                        onChange={(v) => state.pricingUnit.set(v)}
                        options={pricingUnitOptions}
                        icon="shopping-cart"
                    />
                    <FilterDropdown
                        label="Cost"
                        value={duration}
                        onChange={(v) => state.duration.set(v)}
                        options={durationOptions}
                        icon="shopping-cart"
                    />
                    <FilterDropdown
                        label="Reserved"
                        value={reservedTerm}
                        onChange={(v) => state.reservedTerm.set(v)}
                        options={reservedTermOptions}
                        icon="globe"
                    />
                    <ColumnFilter
                        columns={columnOptions}
                        onColumnVisibilityChange={(k, v) => {
                            state.columVisibility.mutate((o) => {
                                o[k] = v;
                            });
                        }}
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
                            onChange={(e) => state.searchTerm.set(e.target.value)}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
