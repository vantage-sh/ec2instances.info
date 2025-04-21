import { atom } from "atomtree";
import { initialColumnsValue } from "./columnVisibility";

export default {
    columVisibility: atom({...initialColumnsValue}),
};
