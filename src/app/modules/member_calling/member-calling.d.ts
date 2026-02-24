import type Table from "../shared/table.types";
import type { MemberCallingCalculatedValues } from "./member-calling-calculated";

export namespace MemberCalling {
    export type Insert = Table.Insert<"member_calling">;
    export type Update = Table.Update<"member_calling">;
    export type Row = Table.RowWithCalculated<"member_calling", MemberCallingCalculatedValues>;
}