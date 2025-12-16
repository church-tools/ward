import { SupabaseClient } from "@supabase/supabase-js";
import { AsyncState } from "../async-state";
import { IDBFilterBuilder } from "./idb/idb-filter-builder";
import { IDBRead } from "./idb/idb-read";
import { IDBStoreAdapter } from "./idb/idb-store-adapter";
import type { Change, Column, Database, Insert, Row, SupaSyncTableInfo, TableName, Update } from "./supa-sync.types";

function getRandomId() {
    return Date.now() * 100000 + Math.floor(Math.random() * 100000);
}

function serializeIndex(index: string[] | undefined) {
    return (index ?? []).join(',');
}

const INDEX_PREFIX = "idx_";
const PENDING_SUFFIX = "_pending";

export class SupaSyncTable<D extends Database, T extends TableName<D>, IA = {}> {

    public readonly storeAdapter: IDBStoreAdapter<Row<D, T>>;
    public readonly pendingAdapter: IDBStoreAdapter<Update<D, T>>;
    public readonly idKey: Column<D, T>;
    public readonly needsUpgrade: boolean;
    private readonly createOffline: boolean;
    private readonly updateOffline: boolean;
    private sendPendingTimeout?: ReturnType<typeof setTimeout> | undefined;

    constructor(
        private readonly tableName: T,
        private readonly supabaseClient: SupabaseClient<D>,
        private readonly onlineState: AsyncState<boolean>,
        public readonly info: SupaSyncTableInfo<D, T> & IA
    ) {
        this.idKey = info.idPath ?? 'id';
        this.createOffline = info.createOffline ?? true;
        this.updateOffline = info.updateOffline ?? true;
        this.onlineState = onlineState;
        this.storeAdapter = new IDBStoreAdapter<Row<D, T>>(tableName);
        this.pendingAdapter = new IDBStoreAdapter<any>(tableName + PENDING_SUFFIX);
        const currentIndex = localStorage.getItem(INDEX_PREFIX + tableName);
        this.needsUpgrade = currentIndex !== serializeIndex(info.indexed);
        this.sendPending();
    }

    public init(idb: Promise<IDBDatabase>) {
        this.storeAdapter.init(idb);
        this.pendingAdapter.init(idb);
        if (this.needsUpgrade) {
            const serialized = serializeIndex(this.info.indexed);
            localStorage.setItem(INDEX_PREFIX + this.tableName, serialized);
        }
    }
    
    public read(id: IDBValidKey) {
        return new IDBRead(this.storeAdapter, [id], rows => rows.length ? rows[0] : null);
    }

    public readMany(ids: IDBValidKey[]) {
        return new IDBRead(this.storeAdapter, ids, rows => rows);
    }

    public readAll() {
        return new IDBRead(this.storeAdapter, undefined, rows => rows);
    }

    public find() {
        return new IDBFilterBuilder(this.storeAdapter, rows => rows);
    }
    
    public findKeys() {
        return new IDBFilterBuilder(this.storeAdapter, rows => rows);
    }

    public findOne() {
        return new IDBFilterBuilder(this.storeAdapter, rows => rows.length ? rows[0] : null);
    }

    public async insert<I extends Insert<D, T> | Insert<D, T>[]>(row: I): Promise<I extends Insert<D, T>[] ? Row<D, T>[] : Row<D, T>> {
        await this.storeAdapter.initialized.get();
        const isArray = Array.isArray(row);
        const rows: Insert<D, T>[] = isArray ? row : [row];
        if (this.createOffline) {
            for (const row of rows) {
                row[this.idKey] ??= getRandomId();
                row.__new = true;
            }
            this.storeAdapter.writeMany(rows);
            await this.writePending(rows);
            return isArray ? rows : rows[0];
        } else {
            if (rows.some(r => r[this.idKey] == null)) {
                let largestId = await this.findLargestId() ?? 0;
                for (const row of rows)
                    if (row[this.idKey] == null)
                        row[this.idKey] = ++largestId;
            }
            const { data } = await this.supabaseClient.from(this.tableName)
                .insert(rows)
                .select("*")
                .throwOnError();
            await this.storeAdapter.writeMany(data);
            return isArray ? data : data[0] as Row<D, T>;
        }
    }

    public async update(update: Update<D, T> | Update<D, T>[], debounce = 0) {
        await this.storeAdapter.initialized.get();
        const updates = Array.isArray(update) ? update : [update];
        let changes: Change<T>[] | undefined;
        if (this.updateOffline) {
            await Promise.all([
                this.storeAdapter.lock(async () => {
                    const rows = await this.storeAdapter.readMany(updates.map(update => update[this.idKey]));
                    for (let i = 0; i < updates.length; i++) {
                        const existingRow = rows[i];
                        const update = updates[i];
                        if (!update[this.idKey])
                            throw new Error(`Missing ID for update: ${JSON.stringify(update)}`);
                        Object.assign(existingRow ?? {}, updates[i]);
                    }
                    changes = await (this.storeAdapter.onChangeReceived.hasSubscriptions
                        ? this.storeAdapter.writeAndGet(rows)
                        : this.storeAdapter.writeMany(rows));
                }),
                this.writePending(updates, debounce),
            ]);
        } else {
            const { data } = await this.supabaseClient.from(this.tableName)
                .upsert(updates)
                .select("*")
                .throwOnError();
            changes = await (this.storeAdapter.onChangeReceived.hasSubscriptions
                ? this.storeAdapter.writeAndGet(data)
                : this.storeAdapter.writeMany(data));
        }
        if (changes) this.storeAdapter.onChangeReceived.emit(changes);
    }

    public async delete(row: Row<D, T> | number | string) {
        const id = typeof row === 'object' ? row[this.idKey] : row as any;
        if (this.updateOffline) {
            await this.supabaseClient.from(this.tableName).delete()
                .eq(this.idKey, id)
                .throwOnError();
        }
        return this.storeAdapter.delete(id);
    }
    
    public async findLargestId() {
        return this.storeAdapter.findLargestId();
    }

    private async writePending(rows: Update<D, T>[], debounce = 0) {
        await this.pendingAdapter.writeMany(rows);
        if (this.sendPendingTimeout) clearTimeout(this.sendPendingTimeout);
        if (debounce)
            this.sendPendingTimeout = setTimeout(() => this.sendPending(), debounce);
        else
            this.sendPending();
    }
    
    private async sendPending(iteration = 1) {
        await this.onlineState.get();
        await this.pendingAdapter.lock(async () => {
            const pendingUpdates = await this.pendingAdapter.readAll();
            if (!pendingUpdates.length) return;
            const indexes = pendingUpdates.map(update => update.__index);
            const pendingById = new Map<number, Update<D, T>>();
            for (const pendingUpdate of pendingUpdates) {
                const existing = pendingById.get(pendingUpdate.id);
                pendingById.set(pendingUpdate.id, existing ? Object.assign(existing, pendingUpdate) : pendingUpdate);
            }
            const sendUpdates = Array.from(pendingById.values());
            for (const update of sendUpdates) delete update.__index;
            const sent = await this.trySend(sendUpdates);
            if (!sent) {
                setTimeout(() => this.sendPending(iteration + 1), Math.min(iteration * 3000, 15000));
                return;
            }
            await this.pendingAdapter.deleteMany(indexes);
        });
    }

    private async trySend(rows: Update<D, T>[]) {
        if (!this.onlineState.unsafeGet()) return false;
        try {
            await Promise.all(rows.map(async row => {
                if (row.__new) {
                    delete row.__new;
                    await this.supabaseClient.from(this.tableName)
                        .insert(row)
                        .throwOnError();
                } else {
                    await this.supabaseClient.from(this.tableName)
                        .update(row)
                        .eq(this.idKey, row[this.idKey])
                        .throwOnError();
                }
            }));
            return true;
        } catch (error) {
            console.error("Error sending updates:", error);
            return false;
        }
    }
}
