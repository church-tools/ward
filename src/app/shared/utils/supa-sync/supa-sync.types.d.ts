export type Database = { public: { Tables: { [key: string]: any } } };
export type TableName<D extends Database> = keyof D["public"]["Tables"] & string;
export type Table<D extends Database, T extends TableName<D>> = D["public"]["Tables"][T]

export type Row<D extends Database, T extends TableName<D>> = Table<D, T>["Row"];
export type Column<D extends Database, T extends TableName<D>, K extends keyof Row<D, T> = keyof Row<D, T>> = Row<D, T>[K] & string;

export type Insert<D extends Database, T extends TableName<D>> = Table<D, T>["Insert"];
export type Update<D extends Database, T extends TableName<D>> = Table<D, T>["Update"];

export type SupaSyncTableInfo<D extends Database, T extends TableName<D>> = {
    name: T;
    idPath?: Column<D, T>; // default: 'id'
    createOffline?: boolean; // default: true
    updateOffline?: boolean; // default: true
    indexed?: Column<D, T>[];
    autoIncrement?: boolean;
}

export type SupaSyncPayload<D extends Database> = {
    commit_timestamp: string,
    table: TableName<D>,
    eventType: 'INSERT' | 'UPDATE' | 'DELETE',
    new: Row<D, TableName<D>>
};
