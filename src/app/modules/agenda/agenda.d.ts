import type { Database } from "../../../../database";

export namespace Agenda {
    export type Insert = Database["public"]["Tables"]["agenda"]["Insert"];
    export type Update = Database["public"]["Tables"]["agenda"]["Update"];
    export type Row = Database["public"]["Tables"]["agenda"]["Row"];
}
