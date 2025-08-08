import type { Database } from "../../../../database";

export namespace Calling {
    export type Insert = Database["public"]["Tables"]["calling"]["Insert"];
    export type Update = Database["public"]["Tables"]["calling"]["Update"];
    export type Row = Database["public"]["Tables"]["calling"]["Row"];
}