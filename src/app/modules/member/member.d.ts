import type { Database } from "../../../../database";
import type Table from "../shared/table.types";

export namespace Member {
    export type Insert = Table.Insert<"member">;
    export type Update = Table.Update<"member">;
    export type Row = Table.RowWithCalculated<"member">;

    export type Gender = Database["public"]["Enums"]["gender"];
}