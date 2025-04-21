import { atom } from "atomtree";
import { initialColumnsValue } from "./columnVisibility";

export default {
    columVisibility: atom({...initialColumnsValue}),
    searchTerm: atom(''),
    selectedRegion: atom('us-east-1'),
    pricingUnit: atom('instance'),
    duration: atom('hourly'),
    reservedTerm: atom('yrTerm1Standard.noUpfront'),
};
