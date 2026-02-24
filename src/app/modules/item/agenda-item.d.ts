import type Table from "../shared/table.types";

export namespace AgendaItem {
    export type Insert = Table.Insert<"agenda_item">;
    export type Update = Table.Update<"agenda_item">;
    export type Row = Table.Row<"agenda_item">;

    export type type = Row['type'];
}