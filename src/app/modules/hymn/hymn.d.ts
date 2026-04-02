import type Table from "../shared/table.types";

export namespace Hymn {
    export type Insert = Table.Insert<'hymn'>;
    export type Update = Table.Update<'hymn'>;
    export type Row = Table.Row<'hymn'>;
}
