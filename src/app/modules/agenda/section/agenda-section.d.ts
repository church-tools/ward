import type { Database } from "../../../../../database";

export namespace AgendaSection {
    export type Insert = Database["public"]["Tables"]["agenda_section"]["Insert"];
    export type Update = Database["public"]["Tables"]["agenda_section"]["Update"];
    export type Row = Database["public"]["Tables"]["agenda_section"]["Row"];

    export type Type = Row["type"];
}