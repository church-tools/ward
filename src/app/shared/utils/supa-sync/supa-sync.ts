import { Session, SupabaseClient } from "@supabase/supabase-js";
import { AsyncState } from "../async-state";
import { executeOnce, Lock } from "../flow-control-utils";
import { ChannelConnection } from "./channel-connection";
import { SupaSyncTable } from "./supa-sync-table";
import type { AnyCalculatedValues, CalculatedOf, Change, Database, SupaSyncCalculatedMap, SupaSyncPayload, SupaSyncTableInfo, SupaSyncTableInfos, TableName } from "./supa-sync.types";

const LAST_SYNC_KEY = "last_sync";
const VERSION_KEY = "version";

async function rejectOnError(reject: (err: any) => void, fn: () => void) {
    try {
        return fn();
    } catch (err) {
        reject(err);
        throw err;
    }
}

export class SupaSync<
    D extends Database,
    IA extends Partial<{ [K in TableName<D>]: any }> = {},
    CM extends SupaSyncCalculatedMap<D, any> = SupaSyncCalculatedMap<D>,
> {
    private changesConnection: ChannelConnection | undefined;
    private presenceChannel: ChannelConnection | undefined;
    private readonly onlineState = new AsyncState<boolean>(navigator.onLine);
    private readonly eventLock = new Lock();
    private readonly client: SupabaseClient<D>;
    private readonly tablesByName: { [T in TableName<D>]: SupaSyncTable<D, T, CalculatedOf<D, T, CM>, IA[T]> } = {} as any;
    private idb: Promise<IDBDatabase> | undefined;

    constructor(
        supabaseClient: SupabaseClient<D>,
        tableInfos: SupaSyncTableInfos<D, IA, CM>,
    ) {
        this.client = supabaseClient;
        window.addEventListener('online', () => this.onlineState.set(true));
        window.addEventListener('offline', () => this.onlineState.unset());
        type TN = TableName<D>;
        for (const name in tableInfos) {
            const info = tableInfos[name as TN];
            this.tablesByName[name as TN] = new SupaSyncTable<D, TN, CalculatedOf<D, TN, CM>, IA[TN]>(name,
                this.client, this.onlineState, this.tablesByName, info as IA[TN], this.resync.bind(this));
        }
        for (const table of Object.values(this.tablesByName))
            table._buildReverseDependencies();
    }

    public async init(session: Session, dbName: string) {
        await this.client.realtime.setAuth(session.access_token);
        const tables = this.getTables();
        let version = +(localStorage.getItem(VERSION_KEY) ?? "1");
        if (tables.some(table => table.indexNeedsUpgrade))
            version++;
        const idb = this.idb = new Promise<IDBDatabase>((resolve, reject) => {
            const openRequest = indexedDB.open(dbName, version);
            openRequest.onupgradeneeded = event => rejectOnError(reject, () => {
                const idb = (event.target as IDBOpenDBRequest).result;
                for (const table of tables) {
                    const indexedKeys = new Set([...table.idKeys, ...Object.keys(table.indexed)]);
                    const store = idb.objectStoreNames.contains(table.name)
                        ? (event.target as IDBOpenDBRequest).transaction!.objectStore(table.name)
                        : idb.createObjectStore(table.name, {
                            keyPath: table.hasCompositeKeys ? table.idKeys : table.idKeys[0] as any,
                            autoIncrement: !table.hasCompositeKeys
                        });
                    const existingIndexSet = new Set(store.indexNames);
                    for (const indexKey of indexedKeys)
                        if (!existingIndexSet.has(indexKey))
                            store.createIndex(indexKey, indexKey);
                    for (const indexName of store.indexNames)
                        if (!indexedKeys.has(indexName))
                            store.deleteIndex(indexName);
                    const pendingName = table._pendingAdapter.storeName;
                    if (!idb.objectStoreNames.contains(pendingName))
                        idb.createObjectStore(pendingName, { keyPath: '__index', autoIncrement: true });
                    const searchName = table._summaryInfo?.adapter.storeName;
                    if (searchName && !idb.objectStoreNames.contains(searchName))
                        idb.createObjectStore(searchName, { keyPath: 'idx' });
                }
            });
            localStorage.setItem(VERSION_KEY, version.toString());
            openRequest.onsuccess = event => resolve((event.target as IDBOpenDBRequest).result);
            openRequest.onerror = event => reject((event.target as IDBOpenDBRequest).error);
            openRequest.onblocked = () => reject(new Error("IndexedDB is blocked. Please close other tabs using this database."));
        });
        this.changesConnection ??= new ChannelConnection(
            () => this.client.channel(`schema-db-changes`)
                .on('postgres_changes', { event: '*', schema: 'public' }, this.processChanges.bind(this)),
            this.onlineState);
        const lastUpdatedAt = await this.getLastSync();
        const now = new Date().toISOString();
        await Promise.all(tables.map(async table => {
            await table._init(idb);
            await table._sync(lastUpdatedAt);
        }));
        this.setLastSync(now);
    }

    private async resync() {
        executeOnce(async () => {
            await this.clear();
            const lastUpdatedAt = await this.getLastSync();
            const now = new Date().toISOString();
            await Promise.all(Object.values(this.tablesByName).map(table => table._sync(lastUpdatedAt)));
            this.setLastSync(now);
        }, 5000);
    }

    public async cleanup() {
        this.changesConnection?.close(this.client);
        this.changesConnection = undefined;
        const idb = await this.idb;
        idb?.close();
    }

    public from<T extends TableName<D>>(tableName: T) {
        return this.tablesByName[tableName] as SupaSyncTable<D, T, CalculatedOf<D, T, CM>, IA[T]>;
    }

    private async clear() {
        await Promise.all(this.getTables().map(table => Promise.all([
            table._storeAdapter.clear(),
            table._pendingAdapter.clear(),
            table._summaryInfo?.adapter.clear(),
        ])));
        this.setLastSync(new Date(0).toISOString());
    }

    private getTables() {
        return Object.values(this.tablesByName) as SupaSyncTable<D, TableName<D>, AnyCalculatedValues, any>[];
    }
    
    private async processChanges(payload: SupaSyncPayload<D>) {
        await this.eventLock.lock(async () => {
            const table = this.tablesByName[payload.table];
            const adapter = table._storeAdapter;
            switch (payload.eventType) {
                case 'INSERT':
                case 'UPDATE': {
                    if (!payload.new || table._wasSentLately(payload.new))
                        break;
                    if (payload.new[table.deletedKey]) {
                        const deleteId = table.getId(payload.new);
                        const old = await adapter.read(deleteId);
                        await adapter.delete(deleteId);
                        if (old) {
                            const changes = [{ old, new: undefined }] as Change<any>[];
                            adapter.onChange.emit(changes);
                            await table._updateDependentCalculatedValues(changes);
                        }
                    } else {
                        const changes = await table._writeAndDelete([payload.new]);
                        if (changes?.length) {
                            adapter.onChange.emit(changes);
                            await table._updateDependentCalculatedValues(changes);
                        }
                    }
                    break;
                }
                case 'DELETE':
                {
                    if (!payload.old) break;
                    const oldId = table.getId(payload.old);
                    const old = await adapter.read(oldId);
                    await adapter.delete(oldId);
                    if (old) {
                        const changes = [{ old, new: undefined }] as Change<any>[];
                        adapter.onChange.emit(changes);
                        await table._updateDependentCalculatedValues(changes);
                    }
                    break;
                }
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
