import { SupabaseClient } from "@supabase/supabase-js";
import type { AsyncState } from "../async-state";
import { IDBFilterBuilder } from "./idb/idb-filter-builder";
import { IDBRead } from "./idb/idb-read";
import { IDBSearchIndex } from "./idb/idb-search-index";
import { idbBoolToNumber, idbNumberToBool, IDBStoreAdapter } from "./idb/idb-store-adapter";
import type { AnyCalculatedValues, Change, Column, Database, DependentRows, Indexed, IndexType, Insert, NoCalculatedValues, RemoteRow, LocalRow, SearchNode, SupaSyncTableInfo, TableName, Update } from "./supa-sync.types";

const SENT_CACHE_SIZE = 8;

function getRandomId() {
    return Date.now() * 100000 + Math.floor(Math.random() * 100000);
}

function serializeIndexedFields<D extends Database, T extends TableName<D>>(index?: Indexed<D, T>) {
    const indexEntries = index ? Object.entries(index) as [Column<D, T>, IndexType][] : [];
    return indexEntries.map(([key, type]) => `${key}_${type}`).join(',');
}

function equal(a: any, b: any): boolean {
    if (a === b) return true;
    if (!a || !b || typeof a !== 'object' || typeof b !== 'object' || a.constructor !== b.constructor) return false;
    if (Array.isArray(a)) return a.length === b.length && a.every((v, i) => equal(v, b[i]));
    const keys = Object.keys(a);
    return keys.length === Object.keys(b).length && keys.every(k => Object.prototype.hasOwnProperty.call(b, k) && equal(a[k], b[k]));
}

export const SEARCH_INDEX_STORE_NAME = "search_index";
const INDEXED_FIELDS_PREFIX = "idx_fields_";
const SEARCH_VERSION_PREFIX = "search_version_";
const PENDING_SUFFIX = "_pending";
const SEARCH_SUFFIX = "_search";

type CalculatedFieldInfo<D extends Database, T extends TableName<D>, C extends AnyCalculatedValues> = {
    key: keyof C & string;
    dependsOn: [keyof RemoteRow<D, T>, TableName<D>][];
    calculation: (row: LocalRow<D, T, C>, dependencies: DependentRows<D, T>) => C[keyof C] | Promise<C[keyof C]>;
};

export class SupaSyncTable<D extends Database, T extends TableName<D>, C extends AnyCalculatedValues = NoCalculatedValues, IA = {}> {
    
    public readonly _storeAdapter: IDBStoreAdapter<LocalRow<D, T, C>>;
    public readonly _pendingAdapter: IDBStoreAdapter<Update<D, T>>;
    public readonly idKey: Column<D, T>;
    public readonly updatedAtKey: Column<D, T>;
    public readonly deletedKey: Column<D, T>;
    public readonly indexNeedsUpgrade: boolean;
    public readonly searchNeedsUpgrade: boolean = false;
    public readonly createOffline: boolean;
    public readonly updateOffline: boolean;
    public readonly _indexed: Indexed<D, T>;
    public readonly _summaryInfo: {
        index: IDBSearchIndex;
        adapter: IDBStoreAdapter<SearchNode>;
        toString: (row: LocalRow<D, T, C>) => string;
    } | undefined;
    public readonly _calculatedInfo: CalculatedFieldInfo<D, T, C>[];
    public readonly _reverseDependencies: { table: SupaSyncTable<D, TableName<D>, AnyCalculatedValues, any>, key: string }[] = [];

    private readonly latestSents: RemoteRow<D, T>[] = [];
    private sendPendingTimeout?: ReturnType<typeof setTimeout> | undefined;

    constructor(
        public readonly name: T,
        private readonly supabaseClient: SupabaseClient<D>,
        private readonly onlineState: AsyncState<boolean>,
        private readonly tablesByName: { [T2 in TableName<D>]: SupaSyncTable<D, T2, any, any> },
        public readonly info: SupaSyncTableInfo<D, T, C> & IA,
        private readonly resync: () => Promise<void>,
    ) {
        this.idKey = info.idPath ?? 'id';
        this.updatedAtKey = info.updatedAtPath ?? 'updated_at';
        this.deletedKey = info.deletedPath ?? 'deleted';
        this.createOffline = info.createOffline ?? false;
        this.updateOffline = info.updateOffline ?? true;
        this._indexed = info.indexed ?? {};
        this._calculatedInfo = info.calculated
            ? Object.entries(info.calculated).map(
                ([key, { dependsOn, calculation }]) => ({ key, dependsOn: Object.entries(dependsOn ?? {}), calculation }))
            : [];
        if (info.getSummaryString) {
            const adapter = new IDBStoreAdapter<SearchNode>(name + SEARCH_SUFFIX);
            this._summaryInfo = {
                index: new IDBSearchIndex(adapter),
                adapter,
                toString: info.getSummaryString,
            };
        }
        this.onlineState = onlineState;
        this._storeAdapter = new IDBStoreAdapter<LocalRow<D, T, C>>(name);
        this._pendingAdapter = new IDBStoreAdapter<any>(name + PENDING_SUFFIX);
        this.indexNeedsUpgrade = localStorage.getItem(INDEXED_FIELDS_PREFIX + name) !== serializeIndexedFields(this._indexed);
        const indexEntries = Object.entries(this._indexed ?? {}) as [Column<D, T>, IndexType][];
        const boolKeys = indexEntries.filter(([_, t]) => t === Boolean).map(([key, _]) => key);
        if (boolKeys.length) {
            this._storeAdapter.mappingInFunction = (row: RemoteRow<D, T>) => {
                for (const key of boolKeys)
                    if (key in row)
                        row[key] = idbBoolToNumber(row[key]);
                return row;
            };
            this._storeAdapter.mappingOutFunction = (row: RemoteRow<D, T>) => {
                for (const key of boolKeys)
                    if (key in row)
                        row[key] = idbNumberToBool(row[key]);
                return row;
            };
        }
        const searchInfo = this._summaryInfo;
        if (searchInfo) {
            const { index, toString } = searchInfo;
            this.searchNeedsUpgrade = localStorage.getItem(SEARCH_VERSION_PREFIX + name) !== (this.info.searchIndexVersion ?? 0).toString();
            this._storeAdapter.writeCallback = async changes => {
                const updates = changes.map(change => {
                    const { new: newRow, old: oldRow } = change;
                    const row = oldRow ?? newRow!;
                    const oldText = oldRow ? toString(oldRow).toLowerCase() : undefined;
                    const newText = newRow ? toString(newRow).toLowerCase() : undefined;
                    return { old: oldText, new: newText, key: row[this.idKey] as number };
                });
                await index.update(updates);
            };
        }
    }

    public async _buildReverseDependencies() {
        for (const [key, sourceTable] of this._calculatedInfo.map(info => info.dependsOn).flat()) {
            const otherRevDeps = this.tablesByName[sourceTable]._reverseDependencies;
            otherRevDeps.push({ table: this as any, key: key as string });
        }
    }

    public async _init(idb: Promise<IDBDatabase>) {
        this._storeAdapter.init(idb);
        this._pendingAdapter.init(idb);
        this._summaryInfo?.adapter.init(idb);
        if (this.indexNeedsUpgrade) {
            const indexedFieldsStr = serializeIndexedFields(this._indexed);
            localStorage.setItem(INDEXED_FIELDS_PREFIX + this.name, indexedFieldsStr);
        }
        if (this.searchNeedsUpgrade) {
            localStorage.setItem(SEARCH_VERSION_PREFIX + this.name, (this.info.searchIndexVersion ?? 0).toString());
            const summaryInfo = this._summaryInfo;
            if (summaryInfo) {
                const { index, toString } = summaryInfo;
                await index.clear();
                const allItems = await this.readAll().get();
                const updates = allItems.map(item => ({
                    old: undefined,
                    new: toString(item).toLowerCase(),
                    key: item[this.idKey] as number,
                }));
                await index.update(updates);
            }
        }
        if (this._calculatedInfo.length)
            await this.backfillCalculatedValues();
        this.sendPending();
    }

    public async __(key: keyof RemoteRow<D, T>, dependencyIds: number[]) {
        if (!dependencyIds.length) return [] as Change<LocalRow<D, T, C>>[];
        const rows = await this.find().in(key as Column<D, T>, dependencyIds as never[]).get();
        if (!rows.length) return [] as Change<LocalRow<D, T, C>>[];
        const updatedRows = await this.applyCalculatedValues(rows);
        return await (this._storeAdapter.onChange.hasSubscriptions
            ? this._storeAdapter.writeAndGet(updatedRows)
            : (await this._storeAdapter.writeMany(updatedRows), [] as Change<LocalRow<D, T, C>>[]));
    }
    
    public read(id: IDBValidKey) {
        return new IDBRead(this._storeAdapter, [id], rows => rows.length ? rows[0] : null);
    }

    public readMany(ids: IDBValidKey[]) {
        return new IDBRead(this._storeAdapter, ids, rows => rows);
    }

    public readAll() {
        return new IDBRead(this._storeAdapter, undefined, rows => rows);
    }

    public find() {
        return new IDBFilterBuilder(this._storeAdapter, this._summaryInfo?.index, rows => rows, this._indexed);
    }
    
    public findKeys() {
        return new IDBFilterBuilder(this._storeAdapter, this._summaryInfo?.index, rows => rows, this._indexed);
    }

    public findOne() {
        return new IDBFilterBuilder(this._storeAdapter, this._summaryInfo?.index, rows => rows.length ? rows[0] : null, this._indexed);
    }

    public async insert<I extends Insert<D, T> | Insert<D, T>[]>(row: I): Promise<I extends Insert<D, T>[] ? LocalRow<D, T, C>[] : LocalRow<D, T, C>> {
        await this._storeAdapter.initialized.get();
        const isArray = Array.isArray(row);
        const rows: Insert<D, T>[] = isArray ? row : [row];
        if (this.createOffline) {
            for (const row of rows) {
                row[this.idKey] ??= getRandomId();
                row.__new = true;
            }
            const rowsWithCalculatedValues = await this.applyCalculatedValues(rows);
            this._storeAdapter.writeMany(rowsWithCalculatedValues as Insert<D, T>[]);
            await this.writePending(rows);
            return (isArray ? rowsWithCalculatedValues : rowsWithCalculatedValues[0]) as I extends Insert<D, T>[] ? LocalRow<D, T, C>[] : LocalRow<D, T, C>;
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
            const rowsWithCalculatedValues = await this.applyCalculatedValues(data as LocalRow<D, T, C>[]);
            await this._storeAdapter.writeMany(rowsWithCalculatedValues);
            return (isArray ? rowsWithCalculatedValues : rowsWithCalculatedValues[0]) as I extends Insert<D, T>[] ? LocalRow<D, T, C>[] : LocalRow<D, T, C>;
        }
    }

    public async update(update: Update<D, T> | Update<D, T>[], debounce?: number) {
        await this._storeAdapter.initialized.get();
        const updates = Array.isArray(update) ? update : [update];
        const missingIds = updates.filter(u => !u[this.idKey]);
        if (missingIds.length) throw new Error(`Missing IDs for updates: ${JSON.stringify(missingIds)}`);
        let changes: Change<LocalRow<D, T, C>>[] | undefined;
        if (this.updateOffline) {
            await Promise.all([
                this._storeAdapter.lock(async () => {
                    changes = await this._writeAndDelete(updates);
                }),
                this.writePending(updates, debounce),
            ]);
        } else {
            const { data } = await this.supabaseClient.from(this.name)
                .upsert(updates)
                .select("*")
                .throwOnError();
            changes = await this._writeAndDelete(data);
        }
        if (changes) this._storeAdapter.onChange.emit(changes);
    }

    public async delete(row: RemoteRow<D, T> | number | string) {
        const id = typeof row === 'object' ? row[this.idKey] : row as any;
        await Promise.all([
            this._storeAdapter.delete(id),
            (this.updateOffline
                ? this.supabaseClient.from(this.name).update({ [this.deletedKey]: true } as any)
                : this.supabaseClient.from(this.name).delete()
            ).eq(this.idKey, id).throwOnError()
        ]);
    }
    
    public async findLargestId() {
        return this._storeAdapter.findLargestId();
    }

    public _wasSentLately(row: RemoteRow<D, T>) {
        const sentRow = this.latestSents.find(r => r[this.idKey] === row[this.idKey]);
        if (!sentRow) return false;
        for (const key in sentRow) {
            if (key === this.idKey) continue;
            const received = row[key];
            const sent = sentRow[key];
            if (key === this.updatedAtKey && received > sent)
                return false;
            if (!equal(received, sent))
                return false;
        }
        return true;
    }

    public async _writeAndDelete(rows: Update<D, T>[]) {
        const updated = rows.filter(update => !update[this.deletedKey]);
        const deletedIds = rows.filter(update => update[this.deletedKey]).map(update => update[this.idKey] as number);
        const rowsWithCalc = await this.applyCalculatedValues(updated);
        return await (this._storeAdapter.onChange.hasSubscriptions
            ? this._storeAdapter.writeAndGet(rowsWithCalc, deletedIds)
            : this._storeAdapter.writeMany(rowsWithCalc, deletedIds));
    }

    public async _updateDependentCalculatedValues(changes: Change<any>[]) {
        if (!this._reverseDependencies.length) return;
        const ids = changes.map(change => change.old?.[this.idKey] ?? change.new[this.idKey]) as number[];
        await Promise.all(this._reverseDependencies.map(async target => {
            const rows = await this.find().in(target.key, ids).get();
            if (!rows.length) return;
            const updatedRows = await this.applyCalculatedValues(rows);
            const dependentChanges = target.table._storeAdapter.onChange.hasSubscriptions
                ? await target.table._storeAdapter.writeAndGet(updatedRows)
                : await target.table._storeAdapter.writeMany(updatedRows);
            if (dependentChanges?.length)
                target.table._storeAdapter.onChange.emit(dependentChanges as Change<any>[]);
        }));
    }

    private async writePending(rows: Update<D, T>[], debounce = 0) {
        await this._pendingAdapter.writeMany(rows);
        if (this.sendPendingTimeout) clearTimeout(this.sendPendingTimeout);
        if (debounce)
            this.sendPendingTimeout = setTimeout(() => this.sendPending(), debounce);
        else
            this.sendPending();
    }
    
    private async sendPending(iteration = 1) {
        await this.onlineState.get();
        await this._pendingAdapter.lock(async () => {
            const pendingUpdates = await this._pendingAdapter.readAll();
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
            await this._pendingAdapter.deleteMany(indexes);
        });
    }

    private async trySend(rows: Update<D, T>[]) {
        if (!this.onlineState.unsafeGet()) return false;
        try {
            await Promise.all(rows.map(async row => {
                const sendRow = { ...row } as RemoteRow<D, T>;
                const isNew = '__new' in row;
                if (isNew) delete sendRow.__new;
                if ('_calculated' in sendRow) delete sendRow._calculated;
                const query = isNew
                    ? this.supabaseClient.from(this.name).upsert(sendRow)
                    : this.supabaseClient.from(this.name).update(sendRow).eq(this.idKey, sendRow[this.idKey]);
                const { data } = await query
                    .select(this.updatedAtKey)
                    .single()
                    .throwOnError();
                if (this.updatedAtKey)
                    row[this.updatedAtKey] = data[this.updatedAtKey];
                this.latestSents.unshift(sendRow);
                if (this.latestSents.length > SENT_CACHE_SIZE)
                    this.latestSents.pop();
            }));
            return true;
        } catch (error: any) {
            if (error.code === 'PGRST204') this.resync();
            console.error("Error sending updates:", error);
            return false;
        }
    }

    private async applyCalculatedValues(rows: RemoteRow<D, T>[]) {
        if (!rows.length) return rows;
        const rowsWithCalc = rows as LocalRow<D, T, C>[];
        if (this._calculatedInfo.length) {
            for (const field of this._calculatedInfo) {
                const { dependsOn, calculation } = field;
                const dependencyData = await this.getDependentRowsData(rowsWithCalc, dependsOn);
                const values = rowsWithCalc.map(row => {
                    const dependencies: Partial<DependentRows<D, T>> = {};
                    for (const dependency of dependencyData) {
                        const dependencyId = row[dependency.key] as number | null | undefined;
                        if (!dependencyId) continue;
                        dependencies[dependency.key] = dependency.rowsById[dependencyId];
                    }
                    return calculation(row, dependencies as unknown as DependentRows<D, T>);
                });
                rowsWithCalc.forEach((row, index) => {
                    const local = (this.ensureCalculatedContainer(row) as AnyCalculatedValues);
                    local[field.key] = values[index];
                    row._calculated = local;
                });
            }
        } else {
            for (const row of rowsWithCalc)
                row._calculated = {} as C
        }
        return rowsWithCalc;
    }

    private async getDependentRowsData(rows: LocalRow<D, T, C>[], dependsOn: [keyof RemoteRow<D, T>, TableName<D>][]) {
        if (!dependsOn.length) return [];
        const dependencies = dependsOn.map(([key, tableName]) => ({
            key,
            table: this.tablesByName[tableName],
            ids: new Set<number>(),
            rowsById: {} as Record<number, RemoteRow<D, any>>,
        }));
        for (const row of rows)
            for (const { key, ids } of dependencies) {
                const dependencyId = row[key] as number | null | undefined;
                if (dependencyId) ids.add(dependencyId);
            }
        await Promise.all(dependencies.map(async dependency => {
            const ids = [...dependency.ids];
            if (!ids.length) return;
            const rows = await dependency.table.find().in('id', ids).get();
            dependency.rowsById = Object.fromEntries(rows.map(row => [row.id as number, row]));
        }));
        return dependencies;
    }

    private ensureCalculatedContainer(row: LocalRow<D, T, C>) {
        const existing = row._calculated as C | undefined;
        if (existing) return existing;
        const created = {} as C;
        row._calculated = created;
        return created;
    }

    private async backfillCalculatedValues() {
        const rows = await this.readAll().get();
        if (!rows.length) return;
        const updatedRows = await this.applyCalculatedValues(rows);
        await this._storeAdapter.writeMany(updatedRows);
    }
}
