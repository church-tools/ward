import type Table from "../../../shared/table.types";

export namespace CustomText {
    export type Insert = Table.Insert<'custom_text'>;
    export type Update = Table.Update<'custom_text'>;
    export type Row = Table.Row<'custom_text'>;
}
