import type { Database } from "../../../../database";

export namespace Organization {
    export type Insert = Database["public"]["Tables"]["organization"]["Insert"];
    export type Update = Database["public"]["Tables"]["organization"]["Update"];
    export type Row = Database["public"]["Tables"]["organization"]["Row"];
}