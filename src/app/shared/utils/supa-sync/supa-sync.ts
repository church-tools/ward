import { RealtimeChannel, Session, SupabaseClient } from "@supabase/supabase-js";
import { AsyncState } from "../async-state";
import { Lock } from "../flow-control-utils";
import { SupaSyncTable } from "./supa-sync-table";
import type { Database, SupaSyncPayload, SupaSyncTableInfo, TableName } from "./supa-sync.types";

const LAST_SYNC_KEY = "last_sync";
const VERSION_KEY = "version";

export class SupaSync<D extends Database, IA extends { [K in TableName<D>]?: any } = {}> {

    private channel: RealtimeChannel | undefined;
    private readonly onlineState = new AsyncState<boolean>(navigator.onLine);
    private readonly eventLock = new Lock();
    private readonly client: SupabaseClient<D, 'public'>;
    private readonly tablesByName: { [T in TableName<D>]: SupaSyncTable<D, T, IA[T]> } = {} as any;
    private idb: Promise<IDBDatabase> | undefined;

    constructor(
        supabaseClient: SupabaseClient<D, 'public'>,
        tableInfos: Array<{
            [K in TableName<D>]: SupaSyncTableInfo<D, K> & IA[K]
        }[TableName<D>]>
    ) {
        this.client = supabaseClient;
        window.addEventListener('online', () => this.onlineState.set(true));
        window.addEventListener('offline', () => this.onlineState.unset());
        for (const info of tableInfos) {
            const tbl = new SupaSyncTable(
                info.name, this.client, this.onlineState, info as any);
            (this.tablesByName as any)[info.name] = tbl;
        }
    }

    public async init(session: Session, dbName: string) {
        await this.client.realtime.setAuth(session.access_token);
        const tables = Object.values(this.tablesByName) as SupaSyncTable<D, TableName<D>, IA[TableName<D>]>[];
        let version = +(localStorage.getItem(VERSION_KEY) ?? "1");
        if (tables.some(table => table.needsUpgrade))
            version++;
        this.idb = new Promise<IDBDatabase>((resolve, reject) => {
            const openRequest = indexedDB.open(dbName, version);
            openRequest.onupgradeneeded = (event) => {
                const idb = (event.target as IDBOpenDBRequest).result;
                for (const table of tables) {
                    const { name, idPath, indexed } = table.info as SupaSyncTableInfo<D, TableName<D>>;
                    const store = idb.objectStoreNames.contains(name)
                        ? (event.target as IDBOpenDBRequest).transaction!.objectStore(name)
                        : idb.createObjectStore(name, {
                            keyPath: idPath ?? 'id',
                            autoIncrement: true
                        });
                    const existingIndexSet = new Set(store.indexNames);
                    for (const indexName of indexed ?? [])
                        if (!existingIndexSet.has(indexName))
                            store.createIndex(indexName, indexName);
                    const expectedIndexSet = new Set(indexed ?? []);
                    for (const indexName of store.indexNames)
                        if (!expectedIndexSet.has(indexName))
                            store.deleteIndex(indexName);
                    const pendingName = table.pendingAdapter.storeName;
                    idb.objectStoreNames.contains(pendingName)
                        ? (event.target as IDBOpenDBRequest).transaction!.objectStore(pendingName)
                        : idb.createObjectStore(pendingName, { keyPath: '__index', autoIncrement: true });
                }
                localStorage.setItem(VERSION_KEY, version.toString());
                resolve(idb);
            };
            openRequest.onsuccess = (event) => {
                resolve((event.target as IDBOpenDBRequest).result);
            };
            openRequest.onerror = (event) => {
                reject((event.target as IDBOpenDBRequest).error);
            };
            openRequest.onblocked = () => {
                reject(new Error("IndexedDB is blocked. Please close other tabs using this database."));
            };
        });
        for (const table of tables)
            table.init(this.idb);
        this.startSyncing(tables);
    }

    private async startSyncing(tables: SupaSyncTable<D, TableName<D>, IA[TableName<D>]>[]) {
        await this.onlineState.get();
        this.channel = this.client.channel(`schema-db-changes`)
            .on('postgres_changes',
                { event: '*', schema: 'public' },
                async (payload: SupaSyncPayload<D>) => {
                    await this.eventLock.lock(async () => {
                        const adapter = this.tablesByName[payload.table].storeAdapter;
                        switch (payload.eventType) {
                            case 'INSERT':
                            case 'UPDATE':
                                await adapter.write(payload.new);
                                adapter.onChangeReceived.emit([payload]);
                                break;
                            case 'DELETE':
                                await adapter.delete(payload.old!.id);
                                adapter.onChangeReceived.emit([payload]);
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
        const lastUpdatedAt = await this.getLastSync();
        const now = new Date().toISOString();
        await Promise.all(tables.map(async table => {
            const { data } = await this.client.from(table.info.name)
                .select('*')
                .gt('updated_at', lastUpdatedAt)
                .throwOnError();
            const adapter = table.storeAdapter;
            if (data.length) {
                if (adapter.onChangeReceived.hasSubscriptions) {
                    const changes = await adapter.writeAndGet(data);
                    adapter.onChangeReceived.emit(changes);
                } else {
                    await adapter.writeMany(data);
                }
            }
            adapter.initialized.set(true);
        }));
        this.setLastSync(now);
    }

    public cleanup() {
        if (this.channel) {
            this.client.removeChannel(this.channel);
            this.channel = undefined;
        }
        this.idb?.then(idb => idb.close());
    }

    public from<T extends TableName<D>>(table: T) {
        return this.tablesByName[table];
    }

    private async getLastSync() {
        const lastSync = localStorage.getItem(LAST_SYNC_KEY);
        return lastSync ?? new Date(0).toISOString();
    }

    private async setLastSync(lastSync: string) {
        localStorage.setItem(LAST_SYNC_KEY, lastSync);
    }
}
