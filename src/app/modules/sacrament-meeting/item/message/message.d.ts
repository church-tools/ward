import type Table from "../../../shared/table.types";

export namespace Message {
    export type Insert = Table.Insert<'message'>;
    export type Update = Table.Update<'message'>;
    export type Row = Table.Row<'message'>;

    export type Type = Table.Row<'message'>['type'];
}
