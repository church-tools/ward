import type { Database } from "../../../../database";
import type Table from "../shared/table.types";

export namespace Organization {
    export type Insert = Table.Insert<"organization">;
    export type Update = Table.Update<"organization">;
    export type Row = Table.Row<"organization">;

    export type Type = Database["public"]["Enums"]["organization_type"];
}