import type { Database } from "../../../../database";

export namespace Task {
    export type Insert = Database["public"]["Tables"]["task"]["Insert"];
    export type Update = Database["public"]["Tables"]["task"]["Update"];
    export type Row = Database["public"]["Tables"]["task"]["Row"];

    export type Stage = Row['stage'];
}