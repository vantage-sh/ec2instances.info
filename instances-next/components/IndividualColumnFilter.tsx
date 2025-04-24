import { Instance } from "@/types";
import GSettings from "@/utils/g_settings_port";
import { Column } from "@tanstack/react-table";

export default function IndividualColumnFilter({
    gSettings,
    gSettingsFullMutations,
    column,
}: {
    gSettings: GSettings | undefined;
    gSettingsFullMutations: number;
    column: Column<Instance>;
}) {
    return (
        <input
        type="text"
            value={(column.getFilterValue() as string) ?? ''}
            onChange={(e) => column.setFilterValue(e.target.value)}
            placeholder={`Filter ${column.columnDef.header as string}...`}
            className="w-full px-2 py-1 text-sm border rounded"
        />
    );
}
