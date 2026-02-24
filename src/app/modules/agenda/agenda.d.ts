import type Table from "../shared/table.types";

export namespace Agenda {
    export type Insert = Table.Insert<"agenda">;
    export type Update = Table.Update<"agenda">;
    export type Row = Table.Row<"agenda">;
}
