import type { IDBQueryBase } from "@/shared/utils/supa-sync/idb/idb-query-base";
import type { SupaSyncTable } from "@/shared/utils/supa-sync/supa-sync-table";
import type { LocalRow, SupaSyncCalculatedMap } from "@/shared/utils/supa-sync/supa-sync.types";
import type { Database } from "@root/database";
import type { CallingCalculatedValues } from "../calling/calling-calculated";
import type { MemberCallingCalculatedValues } from "../member-calling/member-calling-calculated";
import type { MessageCalculatedValues } from "../sacrament-meeting/item/message/message-calculated";

export type CalculatedMap = SupaSyncCalculatedMap<Database, {
    calling: CallingCalculatedValues;
    member_calling: MemberCallingCalculatedValues;
    message: MessageCalculatedValues;
}>;
export type TableName = keyof Database["public"]["Tables"] & string;
export type Table<T extends TableName> = SupaSyncTable<Database, T, CalculatedMap[T]>;
export type Column<T extends TableName> = keyof RemoteRow<T> & string;
export type NumberColumn<T extends TableName> = Extract<Column<T>, string> | never;
export type Update<T extends TableName> = Database["public"]["Tables"][T]["Update"];
export type Insert<T extends TableName> = Database["public"]["Tables"][T]["Insert"];
export type Row<T extends TableName> = LocalRow<Database, T, CalculatedMap[T]>;
export type RemoteRow<T extends TableName> = Database["public"]["Tables"][T]["Row"];

export type TableQuery<T extends TableName, R extends (Row<T>[])> = IDBQueryBase<Database, T, CalculatedMap[T], R>;

export type TableInfoAdditions<T extends TableName = TableName> = {
    orderKey?: Column<T>;
};
