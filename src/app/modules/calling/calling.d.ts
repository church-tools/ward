import type Table from "../shared/table.types";

export namespace Calling {
    export type Insert = Table.Insert<"calling">;
    export type Update = Table.Update<"calling">;
    export type Row = Table.RowWithCalculated<"calling">;
}