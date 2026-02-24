import type Table from "../shared/table.types";

export namespace Unit {
    export type Insert = Table.Insert<"unit">;
    export type Update = Table.Update<"unit">;
    export type Row = Table.Row<"unit">;
}
