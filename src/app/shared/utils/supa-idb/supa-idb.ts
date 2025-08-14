import { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import { IDBQueryBuilder } from "./idb-query-builder";
import { AsyncState } from "../async-state";
import { IDBStoreAdapter } from "./idb-store-adapter";

export type Database = { public: { Tables: { [key: string]: any } } };
export type TableName<D extends Database> = keyof D["public"]["Tables"];
export type Table<D extends Database, T extends TableName<D>> = D["public"]["Tables"][T]
export type Row<D extends Database, T extends TableName<D>> = Table<D, T>["Row"];

export type IDBStores<D extends Database> = {
    [K in TableName<D>]: {
        keyPath: keyof Row<D, K>;
        indexes?: { [K in TableName<D>]: { unique?: boolean } };
    }
};

function getPendingStoreName(tableName: TableName<Database>) {
    return tableName + '_pending';
}

export class SupaIDB<D extends Database> {

    private channel: RealtimeChannel | undefined;
    private readonly onlineState = new AsyncState<boolean>(navigator.onLine);
    private readonly eventLock = new Lock();
    private readonly client: SupabaseClient<D, 'public'>;
    private readonly idb: Promise<IDBDatabase>;
    private readonly stores: { [K in TableName<D>]: IDBStoreAdapter<Row<D, K>> } = {} as any;

    constructor(supabaseClient: SupabaseClient<D, 'public'>, dbName: string, stores: IDBStores<D>) {
        this.client = supabaseClient;
        window.addEventListener('online', () => this.onlineState.set(true));
        window.addEventListener('offline', () => this.onlineState.unset());
        this.idb = IDBStoreAdapter.setup(dbName, 1, Object.entries(stores)
            .map(([name, { keyPath, indexes }]) => [
                { name, keyPath, indexes: Object.entries(indexes ?? {})
                    .map(([key, { unique }]) => ({ key, unique })) },
                { name: getPendingStoreName(name), keyPath: '__index',
                    autoIncrement: true, indexes: [] },
            ]).flat());
        for (const name of Object.keys(stores)) {
            this.stores[name as TableName<D>] = new IDBStoreAdapter<Row<D, TableName<D>>>(this.idb, name);
        }
    }

    public from(table: TableName<D>) {
        const store = this.stores[table];
        return new IDBQueryBuilder<D, TableName<D>>(store);
    }
}