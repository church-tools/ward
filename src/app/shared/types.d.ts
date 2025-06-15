import type { Database } from "../../../database";

export type TableName = keyof Database["public"]["Tables"];
export type Row<T extends TableName> = Database["public"]["Tables"][T]["Row"];
export type Update<T extends TableName> = Database["public"]["Tables"][T]["Update"];
export type Insert<T extends TableName> = Database["public"]["Tables"][T]["Insert"];
export type IdOf<T extends TableName> = Row<T> extends { id: number } ? number : string;

export type KeyWithValue<T, V> = { [K in keyof T]: T[K] extends V ? K : never; }[keyof T];
