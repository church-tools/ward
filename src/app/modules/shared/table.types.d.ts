import type { Database } from "../../../../database";
import { IDBQueryBase } from "../../shared/utils/supa-sync/idb/idb-query-base";
import { SupaSyncTable } from "../../shared/utils/supa-sync/supa-sync-table";
import { SupaSyncTableInfo } from "../../shared/utils/supa-sync/supa-sync.types";

export type TableName = keyof Database["public"]["Tables"];
export type Table<T extends TableName> = SupaSyncTable<Database, T>;
export type Row<T extends TableName> = Database["public"]["Tables"][T]["Row"];
export type Column<T extends TableName> = keyof Row<T> & string;
export type Update<T extends TableName> = Database["public"]["Tables"][T]["Update"];
export type Insert<T extends TableName> = Database["public"]["Tables"][T]["Insert"];

export type TableQuery<T extends TableName, R extends (Row<T>[])> = IDBQueryBase<Database, T, R>;

export type IdOf<T extends TableName> = Row<T> extends { id: number } ? number : string;
// export type TableQuery<T extends TableName> = SupaSyncQuery<Database, T>;

export type TableInfoAdditions<T extends TableName = TableName> = {
    orderKey?: Column<T>;
};