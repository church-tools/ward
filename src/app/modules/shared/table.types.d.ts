import type { Database } from "../../../../database";
import type { IDBQueryBase } from "../../shared/utils/supa-sync/idb/idb-query-base";
import type { SupaSyncTable } from "../../shared/utils/supa-sync/supa-sync-table";
import type { RowWithCalculated as SupaRowWithCalculated } from "../../shared/utils/supa-sync/supa-sync.types";
import type { MemberCallingCalculatedValues } from "../member_calling/member-calling-calculated";

export type CalculatedMap = SupaSyncCalculatedMap<Database> & {
    member_calling: MemberCallingCalculatedValues;
};
export type TableName = keyof Database["public"]["Tables"];
export type Table<T extends TableName> = SupaSyncTable<Database, T, CalculatedMap[T]>;
export type Column<T extends TableName> = keyof RawRow<T> & string;
export type Update<T extends TableName> = Database["public"]["Tables"][T]["Update"];
export type Insert<T extends TableName> = Database["public"]["Tables"][T]["Insert"];
export type Row<T extends TableName> = SupaRowWithCalculated<Database, T, CalculatedMap[T]>;
export type RawRow<T extends TableName> = Database["public"]["Tables"][T]["Row"];

export type TableQuery<T extends TableName, R extends (Row<T>[])> = IDBQueryBase<Database, T, R>;

export type IdOf<T extends TableName> = RawRow<T> extends { id: number } ? number : string;

export type TableInfoAdditions<T extends TableName = TableName> = {
    orderKey?: Column<T>;
};
