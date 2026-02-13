import { Session, SupabaseClient } from "@supabase/supabase-js";
import { AsyncState } from "../async-state";
import { Lock } from "../flow-control-utils";
import { ChannelConnection } from "./channel-connection";
import { SupaSyncTable } from "./supa-sync-table";
import type { Database, SupaSyncPayload, SupaSyncTableInfo, SupaSyncTableInfos, TableName } from "./supa-sync.types";

const LAST_SYNC_KEY = "last_sync";
const VERSION_KEY = "version";

export class SupaSync<D extends Database, IA extends { [K in TableName<D>]?: any } = {}> {

    private changesConnection: ChannelConnection | undefined;
    private presenceChannel: ChannelConnection | undefined;
    private readonly onlineState = new AsyncState<boolean>(navigator.onLine);
    private readonly eventLock = new Lock();
    private readonly client: SupabaseClient<D>;
    private readonly tablesByName: { [T in TableName<D>]: SupaSyncTable<D, T, IA[T]> };
    private idb: Promise<IDBDatabase> | undefined;

    constructor(
        supabaseClient: SupabaseClient<D>,
        tableInfos: SupaSyncTableInfos<D>,
    ) {
        this.client = supabaseClient;
        window.addEventListener('online', () => this.onlineState.set(true));
        window.addEventListener('offline', () => this.onlineState.unset());
        type TN = TableName<D>;
        this.tablesByName = Object.fromEntries(Object.entries(tableInfos).map(([name, info]) => {
           const table = new SupaSyncTable<D, TN, IA[TN]>(name, this.client, this.onlineState, info!);
           return [name as TN, table];
        })) as unknown as { [T in TableName<D>]: SupaSyncTable<D, T, IA[T]> };
    }

    public async init(session: Session, dbName: string) {
        await this.client.realtime.setAuth(session.access_token);
        const tables = Object.values(this.tablesByName) as SupaSyncTable<D, TableName<D>, IA[TableName<D>]>[];
        let version = +(localStorage.getItem(VERSION_KEY) ?? "1");
        if (tables.some(table => table.needsUpgrade))
            version++;
        const idb = this.idb = new Promise<IDBDatabase>((resolve, reject) => {
            const openRequest = indexedDB.open(dbName, version);
            openRequest.onupgradeneeded = (event) => {
                const idb = (event.target as IDBOpenDBRequest).result;
                for (const table of tables) {
                    const name = table.name;
                    const { idPath, indexed } = table.info as SupaSyncTableInfo<D, TableName<D>>;
                    const indexedKeys = Object.keys(indexed ?? {});
                    const keyPath = idPath ?? 'id';
                    const store = idb.objectStoreNames.contains(name)
                        ? (event.target as IDBOpenDBRequest).transaction!.objectStore(name)
                        : idb.createObjectStore(name, { keyPath, autoIncrement: true });
                    const existingIndexSet = new Set(store.indexNames);
                    for (const indexKey of [keyPath, ...indexedKeys])
                        if (!existingIndexSet.has(indexKey))
                            store.createIndex(indexKey, indexKey);
                    const expectedIndexSet = new Set(indexedKeys);
                    expectedIndexSet.add(keyPath);
                    for (const indexName of store.indexNames)
                        if (!expectedIndexSet.has(indexName))
                            store.deleteIndex(indexName);
                    const pendingName = table.pendingAdapter.storeName;
                    if (!idb.objectStoreNames.contains(pendingName))
                        idb.createObjectStore(pendingName, { keyPath: '__index', autoIncrement: true });
                    const searchName = table.searchAdapter?.storeName;
                    if (searchName && !idb.objectStoreNames.contains(searchName))
                        idb.createObjectStore(searchName, { keyPath: 'idx' });
                }
                localStorage.setItem(VERSION_KEY, version.toString());
            };
            openRequest.onsuccess = event => resolve((event.target as IDBOpenDBRequest).result);
            openRequest.onerror = event => reject((event.target as IDBOpenDBRequest).error);
            openRequest.onblocked = () => reject(new Error("IndexedDB is blocked. Please close other tabs using this database."));
        });
        await Promise.all(tables.map(table => table.init(idb)));
        this.startSyncing(tables);
    }

    private async startSyncing(tables: SupaSyncTable<D, TableName<D>, IA[TableName<D>]>[]) {
        await this.onlineState.get();
        this.changesConnection = new ChannelConnection(
            () => this.client.channel(`schema-db-changes`)
                .on('postgres_changes', { event: '*', schema: 'public' }, this.processChanges.bind(this)),
            this.onlineState
        );
        const lastUpdatedAt = await this.getLastSync();
        const now = new Date().toISOString();
        await Promise.all(tables.map(async table => {
            let query = this.client.from(table.name)
                .select('*')
                .gt(table.updatedAtKey, lastUpdatedAt);
            if (lastUpdatedAt.startsWith('1970-') && table.info.deletable)
                query = query.eq(table.deletedKey, false as any);
            const { data } = await query.throwOnError();
            const adapter = table.storeAdapter;
            if (data.length) {
                const changes = await table['writeAndDelete'](data);
                if (changes) adapter.onChange.emit(changes);
            }
            adapter.initialized.set(true);
        }));
        this.setLastSync(now);
    }

    public cleanup() {
        this.changesConnection?.close(this.client);
        this.idb?.then(idb => idb.close());
    }

    public from<T extends TableName<D>>(tableName: T) {
        return this.tablesByName[tableName];
    }

    private async processChanges(payload: SupaSyncPayload<D>) {
        await this.eventLock.lock(async () => {
            const table = this.tablesByName[payload.table];
            const adapter = table.storeAdapter;
            switch (payload.eventType) {
                case 'INSERT':
                case 'UPDATE':
                    if (payload.new && table.wasSentLately(payload.new))
                        return;
                    const deleted = payload.new?.[table.deletedKey];
                    const input = deleted
                        ? { update: [], delete: [payload.new![table.idKey] as number] }
                        : { update: [payload.new], delete: [] };
                    payload.old = (await adapter.writeAndGet(input.update, input.delete))[0].old;
                    if (payload.new?.[table.deletedKey])
                        payload.new = undefined;
                    adapter.onChange.emit([payload]);
                    break;
                case 'DELETE':
                    await adapter.delete(payload.old![table.idKey]);
                    adapter.onChange.emit([payload]);
                    break;
            }
            this.setLastSync(payload.commit_timestamp);
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
