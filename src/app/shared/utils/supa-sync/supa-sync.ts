import { RealtimeChannel, SupabaseClient, User } from "@supabase/supabase-js";
import { AsyncState } from "../async-state";
import { Lock } from "../flow-control-utils";
import { IDBStoreAdapter, IDBStoreInfo } from "../supa-idb/idb-store-adapter";
import { Row, SupaSyncTable } from "./table/supa-sync-table";

const LAST_SYNC_KEY = "last_sync";

export type Database = { public: { Tables: { [key: string]: any } } };
export type TableName<D extends Database> = keyof D["public"]["Tables"] & string;
export type SupaSyncQueryValue<D extends Database, T extends TableName<D>,
    K extends keyof Row<D, T>> = Row<D, T>[K] |
        { in: Row<D, T>[K][] } |
        { not: Row<D, T>[K] }
export type PureSupaSyncQuery<D extends Database, T extends TableName<D>> =
    { [K in keyof Row<D, T>]?: SupaSyncQueryValue<D, T, K> };
export type SupaSyncQuery<D extends Database, T extends TableName<D>> =
    PureSupaSyncQuery<D, T> &
    { filter?: (row: Row<D, T>, user: User) => boolean };
export type Payload<D extends Database> = {
    commit_timestamp: string,
    table: TableName<D>,
    eventType: 'INSERT' | 'UPDATE' | 'DELETE',
    new: Row<D, TableName<D>>
};

export type IDBInfo<D extends Database> = {
    name: string;
    version: number;
    tables: Partial<{ [K in TableName<D>]: IDBIndexes<D, K> }>;
};

export type IDBIndexes<D extends Database, T extends TableName<D>> =
    Partial<{ [K in keyof Row<D, T>]: { unique?: boolean } }>;

function getPendingStoreName(tableName: TableName<Database>) {
    return tableName + '_pending';
}

export class SupaSync<D extends Database> {

    public static async setup<D extends Database>(supabase: SupabaseClient<D>, user: User, isOnline: AsyncState<boolean>, idbInfo: IDBInfo<D>) {
        const storeInfos: IDBStoreInfo[] = Object.entries(idbInfo.tables).map(([name, indexes]) => [
            { name, keyPath: 'id', indexes: [{ key: 'id', unique: true },
                ...Object.entries(indexes ?? {}).map(([key, value]) => ({ key, unique: value?.unique }))] },
            { name: getPendingStoreName(name), keyPath: '__index', autoIncrement: true }
        ]).flat();
        const idb = await IDBStoreAdapter.setup(idbInfo.name, idbInfo.version, storeInfos);
        const sync = new SupaSync<D>(supabase, user, isOnline);
        for (const { name } of storeInfos)
            sync.adaptersByStoreName[name] = new IDBStoreAdapter<Row<D, TableName<D>>>(idb, name);
        sync.startSyncing(Object.keys(idbInfo.tables));
        return sync;
    }

    private channel: RealtimeChannel | undefined;

    private readonly eventLock = new Lock();
    private readonly adaptersByStoreName: Record<string, IDBStoreAdapter<Row<D, TableName<D>>>> = <any>{};

    constructor(
        private readonly supabase: SupabaseClient<D>,
        private readonly user: User,
        private readonly isOnline: AsyncState<boolean>,
    ) {
    }

    public getTable<T extends TableName<D>>(tableName: T, createOffline: boolean, updateOffline: boolean) {
        const tableAdapter = this.adaptersByStoreName[tableName];
        const pendingStoreAdapter = this.adaptersByStoreName[getPendingStoreName(tableName)];
        return new SupaSyncTable<D, T>(this.supabase, this.user, this.isOnline, tableAdapter,
            pendingStoreAdapter, tableName, createOffline, updateOffline);
    }

    public cleanup() {
        if (this.channel) {
            this.supabase.removeChannel(this.channel);
            this.channel = undefined;
        }
    }

    private async startSyncing(tableNames: TableName<D>[]) {
        await this.isOnline.get();
        const lastUpdatedAt = await this.getLastSync();
        const now = new Date().toISOString();
        await Promise.all(tableNames.map(async tableName => {
            const { data } = await this.supabase.from(tableName)
                .select('*')
                .gt('updated_at', lastUpdatedAt)
                .throwOnError();
            const adapter = this.adaptersByStoreName[tableName];
            if (data.length) {
                await adapter.writeMany(data);
                adapter.onWrite.emit(data);
            }
            adapter.initialized.set(true);
        }));
        this.setLastSync(now);
        this.channel = this.supabase.channel(`schema-db-changes`)
        .on('postgres_changes',
            { event: '*', schema: 'public' },
            async (payload: Payload<D>) => {
                await this.eventLock.lock(async () => {
                    const adapter = this.adaptersByStoreName[payload.table];
                    switch (payload.eventType) {
                        case 'INSERT':
                        case 'UPDATE':
                            await adapter.write(payload.new);
                            adapter.onWrite.emit(payload.new);
                            break;
                        case 'DELETE':
                            await adapter.delete(payload.new.id);
                            break;
                    }
                    this.setLastSync(payload.commit_timestamp);
                });
            })
        .subscribe((status: string) => {
            switch (status) {
                case 'CHANNEL_ERROR':
                    console.error('Failed to subscribe to realtime channel');
                    break;
                case 'TIMED_OUT':
                    console.error('Realtime subscription timed out');
                    break;
            }
        });
    }

    private async getLastSync() {
        const lastSync = localStorage.getItem(LAST_SYNC_KEY);
        return lastSync ?? new Date(0).toISOString();
    }

    private async setLastSync(lastSync: string) {
        localStorage.setItem(LAST_SYNC_KEY, lastSync);
    }
}