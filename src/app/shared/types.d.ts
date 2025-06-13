import type { Database } from "../../../database";

export type TableName = keyof Database["public"]["Tables"];
export type RowOf<T extends TableName> = Database["public"]["Tables"][T]["Row"];
export type IdOf<T extends TableName> = RowOf<T> extends { id: number } ? number : string;

export type KeyWithValue<T, V> = { [K in keyof T]: T[K] extends V ? K : never; }[keyof T];
