import { RealtimeChannel, Session, SupabaseClient } from "@supabase/supabase-js";
import { AsyncState } from "../async-state";
import { Lock } from "../flow-control-utils";
import { getPendingStoreName, SupaSyncTable } from "./supa-sync-table";
import type { Database, SupaSyncPayload, SupaSyncTableInfo, TableName } from "./supa-sync.types";

const LAST_SYNC_KEY = "last_sync";

export class SupaSync<D extends Database, TableInfoAdditions = {}> {

    private channel: RealtimeChannel | undefined;
    private readonly onlineState = new AsyncState<boolean>(navigator.onLine);
    private readonly eventLock = new Lock();
    private readonly client: SupabaseClient<D, 'public'>;
    private readonly tablesByName: { [T in TableName<D>]: SupaSyncTable<D, T, TableInfoAdditions> } = {} as any;
    private idb: Promise<IDBDatabase> | undefined;

    constructor(supabaseClient: SupabaseClient<D, 'public'>, tableInfos: (SupaSyncTableInfo<D, TableName<D>> & TableInfoAdditions)[]) {
        this.client = supabaseClient;
        window.addEventListener('online', () => this.onlineState.set(true));
        window.addEventListener('offline', () => this.onlineState.unset());
        for (const info of tableInfos) {
            this.tablesByName[info.name] = new SupaSyncTable(
                info.name, this.client, this.onlineState, info);
        }
    }

    public async init(session: Session, dbName: string) {
        await this.client.realtime.setAuth(session.access_token);
        const tables = Object.values(this.tablesByName) as SupaSyncTable<D, TableName<D>, TableInfoAdditions>[];
        this.idb = new Promise<IDBDatabase>((resolve, reject) => {
            const openRequest = indexedDB.open(dbName, 1);
            openRequest.onupgradeneeded = (event) => {
                const idb = (event.target as IDBOpenDBRequest).result;
                for (const table of tables) {
                    const { name, idPath: keyPath, indexed } = table.info;
                    const store = idb.objectStoreNames.contains(name)
                        ? (event.target as IDBOpenDBRequest).transaction!.objectStore(name)
                        : idb.createObjectStore(name, {
                            keyPath: keyPath ?? 'id',
                            autoIncrement: true
                        });
                    for (const indexName of indexed ?? [])
                        if (!store.indexNames.contains(indexName))
                            store.createIndex(indexName, indexName);
                    const pendingName = getPendingStoreName(name);
                    idb.objectStoreNames.contains(pendingName)
                        ? (event.target as IDBOpenDBRequest).transaction!.objectStore(pendingName)
                        : idb.createObjectStore(pendingName, { keyPath: '__index', autoIncrement: true });
                }
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

    private async startSyncing(tables: SupaSyncTable<D, TableName<D>, TableInfoAdditions>[]) {
        await this.onlineState.get();
        const lastUpdatedAt = await this.getLastSync();
        const now = new Date().toISOString();
        await Promise.all(tables.map(async table => {
            const { data } = await this.client.from(table.info.name)
                .select('*')
                .gt('updated_at', lastUpdatedAt)
                .throwOnError();
            const adapter = table.storeAdapter;
            if (data.length) {
                await adapter.writeMany(data);
                adapter.onWrite.emit(data);
            }
            adapter.initialized.set(true);
        }));
        this.setLastSync(now);
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
