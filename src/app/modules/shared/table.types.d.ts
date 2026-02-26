import type { Database } from "../../../../database";
import type { IDBQueryBase } from "../../shared/utils/supa-sync/idb/idb-query-base";
import type { SupaSyncTable } from "../../shared/utils/supa-sync/supa-sync-table";
import type { LocalRow } from "../../shared/utils/supa-sync/supa-sync.types";
import type { MemberCallingCalculatedValues } from "../member_calling/member-calling-calculated";

export type CalculatedMap = SupaSyncCalculatedMap<Database> & {
    member_calling: MemberCallingCalculatedValues;
};
export type TableName = keyof Database["public"]["Tables"];
export type Table<T extends TableName> = SupaSyncTable<Database, T, CalculatedMap[T]>;
export type Column<T extends TableName> = keyof RemoteRow<T> & string;
export type Update<T extends TableName> = Database["public"]["Tables"][T]["Update"];
export type Insert<T extends TableName> = Database["public"]["Tables"][T]["Insert"];
export type Row<T extends TableName> = LocalRow<Database, T, CalculatedMap[T]>;
export type RemoteRow<T extends TableName> = Database["public"]["Tables"][T]["Row"];

export type TableQuery<T extends TableName, R extends (Row<T>[])> = IDBQueryBase<Database, T, CalculatedMap[T], R>;

export type IdOf<T extends TableName> = RemoteRow<T> extends { id: number } ? number : string;

export type TableInfoAdditions<T extends TableName = TableName> = {
    orderKey?: Column<T>;
};
