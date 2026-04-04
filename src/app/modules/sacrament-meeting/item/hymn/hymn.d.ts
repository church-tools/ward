import type Table from "../../../shared/table.types";

export namespace Hymn {
    export type Insert = Table.Insert<'singing'>;
    export type Update = Table.Update<'singing'>;
    export type Row = Table.Row<'singing'>;
}