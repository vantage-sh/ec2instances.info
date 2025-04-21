'use client';

import { useState } from 'react';
import { Instance, Region } from './types';
import InstanceTable from './components/InstanceTable';
import Filters from './components/Filters';

export default function Home({
    instances, regions,
}: {
    instances: Instance[],
    regions: Region,
}) {
    const [selectedRegion, setSelectedRegion] = useState('us-east-1');
    const [pricingUnit, setPricingUnit] = useState('instance');
    const [duration, setDuration] = useState('hourly');
    const [reservedTerm, setReservedTerm] = useState('yrTerm1Standard.noUpfront');
    const [searchTerm, setSearchTerm] = useState('');
    const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({
        pretty_name: true,
        instance_type: true,
        family: false,
        memory: true,
        ECU: false,
        vCPU: true,
        memory_per_vcpu: false,
        GPU: false,
        GPU_model: false,
        GPU_memory: false,
        compute_capability: false,
        FPGA: false,
        ECU_per_vcpu: false,
        physical_processor: false,
        clock_speed_ghz: false,
        intel_avx: false,
        intel_avx2: false,
        intel_avx512: false,
        intel_turbo: false,
        storage: true,
        'warmed-up': false,
        'trim-support': false,
        arch: false,
        network_performance: true,
        ebs_baseline_bandwidth: false,
        ebs_baseline_throughput: false,
        ebs_baseline_iops: false,
        ebs_max_bandwidth: false,
        ebs_throughput: false,
        ebs_iops: false,
        ebs_as_nvme: false,
        maxips: false,
        maxenis: false,
        enhanced_networking: false,
        vpc_only: false,
        ipv6_support: false,
        placement_group_support: false,
        linux_virtualization_types: false,
        emr: false,
        availability_zones: false,
        'cost-ondemand': true,
        'cost-reserved': true,
        'cost-spot-min': true,
        'cost-spot-max': false,
        'cost-ondemand-rhel': false,
        'cost-reserved-rhel': false,
        'cost-spot-min-rhel': false,
        'cost-spot-max-rhel': false,
        'cost-ondemand-sles': false,
        'cost-reserved-sles': false,
        'cost-spot-min-sles': false,
        'cost-spot-max-sles': false,
        'cost-ondemand-mswin': true,
        'cost-reserved-mswin': true,
        'cost-spot-min-mswin': false,
        'cost-spot-max-mswin': false,
        'cost-ondemand-dedicated': false,
        'cost-reserved-dedicated': false,
        'cost-ondemand-mswinSQLWeb': false,
        'cost-reserved-mswinSQLWeb': false,
        'cost-ondemand-mswinSQL': false,
        'cost-reserved-mswinSQL': false,
        'cost-ondemand-mswinSQLEnterprise': false,
        'cost-reserved-mswinSQLEnterprise': false,
        'cost-ondemand-linuxSQLWeb': false,
        'cost-reserved-linuxSQLWeb': false,
        'cost-ondemand-linuxSQL': false,
        'cost-reserved-linuxSQL': false,
        'cost-ondemand-linuxSQLEnterprise': false,
        'cost-reserved-linuxSQLEnterprise': false,
        'spot-interrupt-rate': false,
        'cost-emr': false,
        generation: false
    });

    const handleColumnVisibilityChange = (key: string, visible: boolean) => {
        setColumnVisibility(prev => ({
            ...prev,
            [key]: visible,
        }));
    };

    return (
        <main className="container-fluid py-4">
            <Filters
                regions={regions}
                selectedRegion={selectedRegion}
                onRegionChange={setSelectedRegion}
                pricingUnit={pricingUnit}
                onPricingUnitChange={setPricingUnit}
                duration={duration}
                onDurationChange={setDuration}
                reservedTerm={reservedTerm}
                onReservedTermChange={setReservedTerm}
                searchTerm={searchTerm}
                onSearchTermChange={setSearchTerm}
                columnVisibility={columnVisibility}
                onColumnVisibilityChange={handleColumnVisibilityChange}
            />
            <InstanceTable
                instances={instances}
                selectedRegion={selectedRegion}
                pricingUnit={pricingUnit}
                duration={duration}
                reservedTerm={reservedTerm}
                searchTerm={searchTerm}
                columnVisibility={columnVisibility}
            />
        </main>
    );
}
  