import { Database } from "../../../../database";
import { SupaSyncTableInfo } from "../../shared/utils/supa-sync/supa-sync.types";
import { SupaSyncQuery } from "./utils/supa-sync/deprecated-supa-sync";

export type TableName = keyof Database["public"]["Tables"];
export type Row<T extends TableName> = Database["public"]["Tables"][T]["Row"];
export type Column<T extends TableName> = keyof Row<T> & string;
export type Update<T extends TableName> = Database["public"]["Tables"][T]["Update"];
export type Insert<T extends TableName> = Database["public"]["Tables"][T]["Insert"];

export type IdOf<T extends TableName> = Row<T> extends { id: number } ? number : string;
// export type TableQuery<T extends TableName> = SupaSyncQuery<Database, T>;

export type TableInfoAdditions<T extends TableName = TableName> = {
    orderKey?: Column<T>;
};