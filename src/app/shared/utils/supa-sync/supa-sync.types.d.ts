export type Database = { public: { Tables: { [key: string]: any } } };
export type TableName<D extends Database> = keyof D["public"]["Tables"] & string;
export type Table<D extends Database, T extends TableName<D>> = D["public"]["Tables"][T]

export type Row<D extends Database, T extends TableName<D>> = Table<D, T>["Row"];
// Column should be the string literal keys of the Row, not the value types.
export type Column<D extends Database, T extends TableName<D>> = keyof Row<D, T> & string;

export type Insert<D extends Database, T extends TableName<D>> = Table<D, T>["Insert"];
export type Update<D extends Database, T extends TableName<D>> = Table<D, T>["Update"];

export type IndexType = typeof Number | typeof String | typeof Boolean;
export type Indexed<D extends Database, T extends TableName<D>> = Partial<{
    [K in Column<D, T>]: IndexType;
}>;

export type SupaSyncTableInfo<D extends Database, T extends TableName<D>> = {
    name: T;
    idPath?: Column<D, T>; // default: 'id'
    deletedPath?: Column<D, T>; // default: 'deleted'
    createOffline?: boolean; // default: true
    updateOffline?: boolean; // default: true
    indexed?: Indexed<D, T>;
    autoIncrement?: boolean;
}

export type SupaSyncPayload<D extends Database> = {
    commit_timestamp: string,
    table: TableName<D>,
    eventType: 'INSERT' | 'UPDATE' | 'DELETE',
    new: Row<D, TableName<D>> | undefined,
    old: Row<D, TableName<D>> | undefined
};

export type Change<T> = { old?: T, new?: T };

export type QueryResult<R> = { result?: R, deletions?: number[] }