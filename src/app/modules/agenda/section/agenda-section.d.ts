import type Table from "../shared/table.types";

export namespace AgendaSection {
    export type Insert = Table.Insert<"agenda_section">;
    export type Update = Table.Update<"agenda_section">;
    export type Row = Table.RowWithCalculated<"agenda_section">;

    export type Type = Row["type"];
}