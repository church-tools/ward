import type { Database } from "../../../database";

export type TableName = keyof Database["public"]["Tables"];
export type Row<T extends TableName> = Database["public"]["Tables"][T]["Row"];
export type Update<T extends TableName> = Database["public"]["Tables"][T]["Update"];
export type Insert<T extends TableName> = Database["public"]["Tables"][T]["Insert"];
export type IdOf<T extends TableName> = Row<T> extends { id: number } ? number : string;

export type KeyWithValue<T, V> = keyof { [ P in keyof T as T[P] extends V ? P : never ] : P } & keyof T;
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type PartialWith<T, K extends keyof T> = Partial<T> & Pick<T, K>;