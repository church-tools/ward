import type Table from "../shared/table.types";

export namespace MemberCalling {
    export type Insert = Table.Insert<"member_calling">;
    export type Update = Table.Update<"member_calling">;
    export type Row = Table.Row<"member_calling">;
}