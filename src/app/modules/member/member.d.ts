import type { Database } from "../../../../database";

export namespace Member {
    export type Insert = Database["public"]["Tables"]["member"]["Insert"];
    export type Update = Database["public"]["Tables"]["member"]["Update"];
    export type Row = Database["public"]["Tables"]["member"]["Row"];

    export type Gender = Database["public"]["Enums"]["gender"];
}