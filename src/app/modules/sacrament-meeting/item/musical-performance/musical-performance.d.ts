import type Table from "../../../shared/table.types";

export namespace MusicalPerformance {
    export type Insert = Table.Insert<'musical_performance'>;
    export type Update = Table.Update<'musical_performance'>;
    export type Row = Table.Row<'musical_performance'>;
}