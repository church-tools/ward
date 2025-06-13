import type { Database } from "../../../../database.types.ts";

export namespace Unit {
    export type Insert = Database["public"]["Tables"]["unit"]["Insert"];
    export type Update = Database["public"]["Tables"]["unit"]["Update"];
    export type Row = Database["public"]["Tables"]["unit"]["Row"];
}
