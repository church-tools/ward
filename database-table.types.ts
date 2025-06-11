import type { Database } from "./database.types.ts";

type Tables = Database["public"]["Tables"];

export type TableName = keyof Tables;
export type RowOf<T extends TableName> = Tables[T]["Row"];
export type IdOf<T extends TableName> = RowOf<T> extends { id: number } ? number : string;

export type Unit = Tables["unit"]["Row"];
export type Profile = Tables["profile"]["Row"];
export type Agenda = Tables["agenda"]["Row"];