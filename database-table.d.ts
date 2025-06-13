import type { Database } from "./database.types.ts";

type Tables = Database["public"]["Tables"];

export type TableName = keyof Tables;
export type RowOf<T extends TableName> = Tables[T]["Row"];
export type IdOf<T extends TableName> = RowOf<T> extends { id: number } ? number : string;

