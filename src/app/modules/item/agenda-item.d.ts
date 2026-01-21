import type { Database } from "../../../../database";

export namespace AgendaItem {
    export type Insert = Database["public"]["Tables"]["agenda_item"]["Insert"];
    export type Update = Database["public"]["Tables"]["agenda_item"]["Update"];
    export type Row = Database["public"]["Tables"]["agenda_item"]["Row"];

    export type type = Row['type'];
}