import type Table from "../shared/table.types";

export namespace Profile {
    export type Insert = Table.Insert<"profile">;
    export type Update = Table.Update<"profile">;
    export type Row = Table.Row<"profile">;
}