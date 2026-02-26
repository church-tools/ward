
export type Database = { public: { Tables: { [key: string]: any } } };
export type TableName<D extends Database> = keyof D["public"]["Tables"] & string;
export type Table<D extends Database, T extends TableName<D>> = D["public"]["Tables"][T]
export type AnyCalculatedValues = Record<string, unknown>;
export type NoCalculatedValues = Record<string, never>;
export type SupaSyncCalculatedMap<D extends Database> = Partial<{ [K in TableName<D>]: AnyCalculatedValues }>;

export type Column<D extends Database, T extends TableName<D>> = keyof RemoteRow<D, T> & string;

export type RemoteRow<D extends Database, T extends TableName<D>> = Table<D, T>["Row"];
export type Insert<D extends Database, T extends TableName<D>> = Table<D, T>["Insert"];
export type Update<D extends Database, T extends TableName<D>> = Table<D, T>["Update"];

export type SearchNodeChildren = Record<string, number>;
export type SearchNode = { idx: number, keys?: Set<number>; children: SearchNodeChildren };

export type IndexType = typeof Number | typeof String | typeof Boolean;
export type Indexed<D extends Database, T extends TableName<D>> = Partial<{
    [K in Column<D, T>]: IndexType;
}>;

export type Dependencies<D extends Database, T extends TableName<D>> = { [C in keyof RemoteRow<D, T>]?: TableName<D> };
export type DependentRows<
    D extends Database,
    T extends TableName<D>,
    Dep extends Dependencies<D, T> = Dependencies<D, T>,
> = {
    [K in keyof Dep as Extract<Dep[K], TableName<D>> extends never ? never : K]: RemoteRow<D, Extract<Dep[K], TableName<D>>>;
};

export type CalculatedField<D extends Database, T extends TableName<D>, V = unknown> = {
    dependsOn?: Dependencies<D, T>;
    calculation: (row: RemoteRow<D, T>, dependencies: DependentRows<D, T>) => V;
};

export type CalculatedFields<
    D extends Database,
    T extends TableName<D>,
    C extends AnyCalculatedValues,
> = {
    [K in keyof C]-?: CalculatedField<D, T, C[K]>;
};

export type CalculatedOf<
    D extends Database,
    T extends TableName<D>,
    CM extends SupaSyncCalculatedMap<D>,
> = T extends keyof CM ? NonNullable<CM[T]> : NoCalculatedValues;

export type LocalRow<
    D extends Database,
    T extends TableName<D>,
    C extends AnyCalculatedValues = NoCalculatedValues,
> = RemoteRow<D, T> & {
    _calculated: C;
};

export type CalculatedValuesFromFields<TFields extends Record<string, { calculation: (...args: any[]) => any }>> = {
	[K in keyof TFields]: Awaited<ReturnType<TFields[K]["calculation"]>>;
};

export type SupaSyncTableInfo<
    D extends Database,
    T extends TableName<D>,
    C extends AnyCalculatedValues = NoCalculatedValues,
> = {
    idPath?: Column<D, T>; // default: 'id'
    updatedAtPath?: Column<D, T>; // default: 'updated_at'
    deletable?: boolean; // default: true
    deletedPath?: Column<D, T>; // default: 'deleted'
    createOffline?: boolean; // default: false
    updateOffline?: boolean; // default: true
    indexed?: Indexed<D, T>;
    getSummaryString?: (row: LocalRow<D, T, C>) => string;
    calculated?: Partial<CalculatedFields<D, T, C>>;
    searchIndexVersion?: number; // increment to reset search index, default: 0
    autoIncrement?: boolean;
}

export type SupaSyncTableInfos<
    D extends Database,
    IA extends Partial<{ [K in TableName<D>]: any }> = {},
    CM extends SupaSyncCalculatedMap<D> = {},
> = Partial<{ [K in TableName<D>]: SupaSyncTableInfo<D, K, CalculatedOf<D, K, CM>> & (K extends keyof IA ? IA[K] : {}) }>;

export type SupaSyncPayload<D extends Database> = {
    commit_timestamp: string,
    table: TableName<D>,
    eventType: 'INSERT' | 'UPDATE' | 'DELETE',
    new: RemoteRow<D, TableName<D>> | undefined,
    old: RemoteRow<D, TableName<D>> | undefined
};

export type DeleteChange<T> = { old: T, new?: undefined };
export type UpdateChange<T> = { old?: T, new: T };
export type Change<T> = DeleteChange<T> | UpdateChange<T>;

export type QueryResult<R> = { result?: R, deletions?: number[] }