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
            />
            <InstanceTable
                instances={instances}
                selectedRegion={selectedRegion}
                pricingUnit={pricingUnit}
                duration={duration}
                reservedTerm={reservedTerm}
                searchTerm={searchTerm}
            />
        </main>
    );
}
  