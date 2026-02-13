import { SupabaseClient } from "@supabase/supabase-js";
import { AsyncState } from "../async-state";
import { IDBFilterBuilder } from "./idb/idb-filter-builder";
import { IDBRead } from "./idb/idb-read";
import { idbBoolToNumber, idbNumberToBool, IDBStoreAdapter } from "./idb/idb-store-adapter";
import type { Change, Column, Database, Indexed, IndexType, Insert, Row, SearchNode, SupaSyncTableInfo, TableName, Update } from "./supa-sync.types";
import { IDBSearchIndex } from "./idb/idb-search-index";

const SENT_CACHE_SIZE = 8;

function getRandomId() {
    return Date.now() * 100000 + Math.floor(Math.random() * 100000);
}

function serializeIndexedFields<D extends Database, T extends TableName<D>>(index?: Indexed<D, T>) {
    const indexEntries = index ? Object.entries(index) as [Column<D, T>, IndexType][] : [];
    return indexEntries.map(([key, type]) => `${key}_${type}`).join(',');
}

function serializeSearchedFields<D extends Database, T extends TableName<D>>(search?: Column<D, T>[]) {
    return search ? search.join(',') : '';
}

export const SEARCH_INDEX_STORE_NAME = "search_index";
const INDEXED_FIELDS_PREFIX = "idx_fields_";
const SEARCHED_FIELDS_PREFIX = "srch_fields_";
const PENDING_SUFFIX = "_pending";
const SEARCH_SUFFIX = "_search";

export class SupaSyncTable<D extends Database, T extends TableName<D>, IA = {}> {

    public readonly storeAdapter: IDBStoreAdapter<Row<D, T>>;
    public readonly pendingAdapter: IDBStoreAdapter<Update<D, T>>;
    public readonly searchAdapter: IDBStoreAdapter<SearchNode> | undefined;
    public readonly idKey: Column<D, T>;
    public readonly updatedAtKey: Column<D, T>;
    public readonly deletedKey: Column<D, T>;
    public readonly needsUpgrade: boolean;
    public readonly createOffline: boolean;
    public readonly updateOffline: boolean;
    public readonly indexed: Indexed<D, T>;
    public readonly searched: Column<D, T>[];
    public readonly searchIndex: IDBSearchIndex | undefined;

    private readonly latestSents: Row<D, T>[] = [];
    private sendPendingTimeout?: ReturnType<typeof setTimeout> | undefined;

    constructor(
        public readonly name: T,
        private readonly supabaseClient: SupabaseClient<D>,
        private readonly onlineState: AsyncState<boolean>,
        public readonly info: SupaSyncTableInfo<D, T> & IA
    ) {
        this.idKey = info.idPath ?? 'id';
        this.updatedAtKey = info.updatedAtPath ?? 'updated_at';
        this.deletedKey = info.deletedPath ?? 'deleted';
        this.createOffline = info.createOffline ?? true;
        this.updateOffline = info.updateOffline ?? true;
        this.indexed = info.indexed ?? {};
        this.searched = info.search ?? [];
        this.onlineState = onlineState;
        this.storeAdapter = new IDBStoreAdapter<Row<D, T>>(name);
        this.pendingAdapter = new IDBStoreAdapter<any>(name + PENDING_SUFFIX);
        if (this.searched.length) {
            this.searchAdapter = new IDBStoreAdapter<SearchNode>(name + SEARCH_SUFFIX);
            this.searchIndex = new IDBSearchIndex(this.searchAdapter);
        }
        this.needsUpgrade = localStorage.getItem(INDEXED_FIELDS_PREFIX + name) !== serializeIndexedFields(this.indexed)
                        || localStorage.getItem(SEARCHED_FIELDS_PREFIX + name) !== serializeSearchedFields(this.searched);
        const indexEntries = Object.entries(this.indexed ?? {}) as [Column<D, T>, IndexType][];
        const boolKeys = indexEntries.filter(([_, t]) => t === Boolean).map(([key, _]) => key);
        if (boolKeys.length) {
            this.storeAdapter.mappingInFunction = row => {
                for (const key of boolKeys)
                    if (key in row)
                        row[key] = idbBoolToNumber(row[key]);
                return row;
            };
            this.storeAdapter.mappingOutFunction = row => {
                for (const key of boolKeys)
                    if (key in row)
                        row[key] = idbNumberToBool(row[key]);
                return row;
            };
        }
        if (this.searchIndex) {
            this.storeAdapter.writeCallback = async changes => {
                const updates = changes.map(change => {
                    const { new: newRow, old: oldRow } = change;
                    const row = newRow ?? oldRow!;
                    const oldText = oldRow ? this.searched.map(col => oldRow[col] ?? '').join(' ').toLowerCase() : undefined;
                    const newText = newRow ? this.searched.map(col => newRow[col] ?? '').join(' ').toLowerCase() : undefined;
                    return { old: oldText, new: newText, key: row[this.idKey] as number };
                });
                await this.searchIndex!.update(updates);
            };
        }
        this.sendPending();
    }

    public async init(idb: Promise<IDBDatabase>) {
        this.storeAdapter.init(idb);
        this.pendingAdapter.init(idb);
        this.searchAdapter?.init(idb);
        if (this.needsUpgrade) {
            const indexedFieldsStr = serializeIndexedFields(this.indexed);
            localStorage.setItem(INDEXED_FIELDS_PREFIX + this.name, indexedFieldsStr);
            const searchedFieldsStr = serializeSearchedFields(this.searched);
            localStorage.setItem(SEARCHED_FIELDS_PREFIX + this.name, searchedFieldsStr);
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
        return new IDBFilterBuilder(this.storeAdapter, this.searchIndex, rows => rows, this.indexed);
    }
    
    public findKeys() {
        return new IDBFilterBuilder(this.storeAdapter, this.searchIndex, rows => rows, this.indexed);
    }

    public findOne() {
        return new IDBFilterBuilder(this.storeAdapter, this.searchIndex, rows => rows.length ? rows[0] : null, this.indexed);
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
            const { data } = await this.supabaseClient.from(this.name)
                .insert(rows)
                .select("*")
                .throwOnError();
            await this.storeAdapter.writeMany(data);
            return isArray ? data : data[0] as Row<D, T>;
        }
    }

    public async update(update: Update<D, T> | Update<D, T>[], debounce?: number) {
        await this.storeAdapter.initialized.get();
        const updates = Array.isArray(update) ? update : [update];
        const missingIds = updates.filter(u => !u[this.idKey]);
        if (missingIds.length) throw new Error(`Missing IDs for updates: ${JSON.stringify(missingIds)}`);
        let changes: Change<T>[] | undefined;
        if (this.updateOffline) {
            await Promise.all([
                this.storeAdapter.lock(async () => {
                    changes = await this.writeAndDelete(updates);
                }),
                this.writePending(updates, debounce),
            ]);
        } else {
            const { data } = await this.supabaseClient.from(this.name)
                .upsert(updates)
                .select("*")
                .throwOnError();
            changes = await this.writeAndDelete(data);
        }
        if (changes) this.storeAdapter.onChange.emit(changes);
    }

    public async delete(row: Row<D, T> | number | string) {
        const id = typeof row === 'object' ? row[this.idKey] : row as any;
        await Promise.all([
            this.storeAdapter.delete(id),
            (this.updateOffline
                ? this.supabaseClient.from(this.name).update({ [this.deletedKey]: true } as any)
                : this.supabaseClient.from(this.name).delete()
            ).eq(this.idKey, id).throwOnError()
        ]);
    }
    
    public async findLargestId() {
        return this.storeAdapter.findLargestId();
    }

    public wasSentLately(row: Row<D, T>) {
        const sentRow = this.latestSents.find(r => r[this.idKey] === row[this.idKey]);
        if (!sentRow) return false;
        for (const key in sentRow) {
            if (key === this.idKey) continue;
            const received = row[key];
            const sent = sentRow[key];
            if (key === this.updatedAtKey && received > sent)
                return false;
            if (received !== sent) return false;
        }
        return true;
    }

    private writeAndDelete(rows: Update<D, T>[]) {
        const updated = rows.filter(update => !update[this.deletedKey]);
        const deletedIds = rows.filter(update => update[this.deletedKey]).map(update => update[this.idKey] as number);
        return (this.storeAdapter.onChange.hasSubscriptions
            ? this.storeAdapter.writeAndGet(updated, deletedIds)
            : this.storeAdapter.writeMany(updated, deletedIds));
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
                const id = pendingUpdate[this.idKey] as number;
                const existing = pendingById.get(id);
                pendingById.set(id, existing ? Object.assign(existing, pendingUpdate) : pendingUpdate);
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
                const isNew = '__new' in row;
                if (isNew) delete row.__new;
                const query = isNew
                    ? this.supabaseClient.from(this.name).insert(row)
                    : this.supabaseClient.from(this.name).update(row).eq(this.idKey, row[this.idKey]);
                const { data } = await query
                    .select(this.updatedAtKey)
                    .single()
                    .throwOnError();
                if (this.updatedAtKey)
                    row[this.updatedAtKey] = data[this.updatedAtKey];
                this.latestSents.unshift(row as Row<D, T>);
                if (this.latestSents.length > SENT_CACHE_SIZE)
                    this.latestSents.pop();
            }));
            return true;
        } catch (error) {
            console.error("Error sending updates:", error);
            return false;
        }
    }
}
