import componentTests from "@/utils/testing/componentTests";
import IndividualColumnFilter from "./IndividualColumnFilter";
import { costExpr, regex } from "@/utils/colunnData/shared";
import { expect } from "vitest";

function column(id: string, filterFn: unknown) {
    return {
        columnDef: { id, header: "Cost", filterFn },
        getFilterValue: () => undefined,
        setFilterValue: () => {},
    } as any;
}

const exprHelpButton = 'button[title="Show expression help"]';

componentTests(
    [
        {
            name: "cost expression column uses the expression filter",
            props: { column: column("cost-ondemand", costExpr) },
            test: (r) => {
                expect(r.container.querySelector(exprHelpButton)).not.toBe(
                    null,
                );
                expect(r.container.querySelector("input")?.value).toBe(">=0");
            },
        },
        {
            name: "cost-prefixed column with a regex filter uses the text filter",
            props: {
                column: column(
                    "cost-ondemand",
                    regex({ accessorKey: "pricing" }),
                ),
            },
            test: (r) => {
                expect(r.container.querySelector(exprHelpButton)).toBe(null);
                expect(r.container.querySelector("input")?.value).toBe("");
            },
        },
    ],
    IndividualColumnFilter,
);
