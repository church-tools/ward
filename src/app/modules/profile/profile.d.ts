import type { Database } from "../../../../database.types.ts";

export namespace Profile {
    export type Insert = Database["public"]["Tables"]["profile"]["Insert"];
    export type Update = Database["public"]["Tables"]["profile"]["Update"];
    export type Row = Database["public"]["Tables"]["profile"]["Row"];
}