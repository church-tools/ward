import type Table from "../shared/table.types";

export namespace Household {
    export type Insert = Table.Insert<"household">;
    export type Update = Table.Update<"household">;
    export type Row = Table.Row<"household">;
}
