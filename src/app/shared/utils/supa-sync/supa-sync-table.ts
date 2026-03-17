import { SupabaseClient } from "@supabase/supabase-js";
import type { AsyncState } from "../async-state";
import { DeferredPromise } from "./deferred-promise";
import { IDBFilterBuilder } from "./idb/idb-filter-builder";
import { IDBRead } from "./idb/idb-read";
import { IDBSearchIndex } from "./idb/idb-search-index";
import { idbBoolToNumber, idbNumberToBool, IDBStoreAdapter } from "./idb/idb-store-adapter";
import type { AnyCalculatedValues, Change, Column, Database, DependentRows, Indexed, IndexType, Insert, NoCalculatedValues, RemoteRow, LocalRow, SearchNode, SupaSyncTableInfo, TableName, Update, IdColumn, BooleanColumn } from "./supa-sync.types";

const INDEXED_FIELDS_PREFIX = "idx_fields_";
const SEARCH_VERSION_PREFIX = "search_version_";
const PENDING_SUFFIX = "_pending";
const SEARCH_SUFFIX = "_search";

function getRandomId() {
    return Date.now() * 100000 + Math.floor(Math.random() * 100000);
}

function getCombinedIdFn<D extends Database, T extends TableName<D>>(idKeys: ReadonlyArray<IdColumn<D, T>>) {
    return (row: RemoteRow<D, T>) => {
        let combined = row[idKeys[0]] as number;
        for (const key of idKeys.slice(1)) {
            const id = BigInt(row[key] as number);
            const sum = BigInt(combined) + id;
            combined = Number((sum * (sum + 1n)) / 2n + id);
        }
        return combined;
    };
}

function serializeIndexedFields<D extends Database, T extends TableName<D>>(index?: Indexed<D, T>) {
    const indexEntries = index ? Object.entries(index) as [Column<D, T>, IndexType][] : [];
    return indexEntries.map(([key, type]) => `${key}_${type}`).join(',');
}

function classifyArray<T, T2 = T>(array: T[], predicate: (item: T) => boolean): { matched: T[]; unmatched: T2[] } {
    const matched: T[] = [], unmatched: T2[] = [];
    for (const item of array) (predicate(item) ? matched : unmatched).push(item as any);
    return { matched, unmatched };
}

type PendingUpdate<D extends Database, T extends TableName<D>> = Update<D, T> & { __new?: boolean; __index?: number; _calculated?: any };

type CalculatedFieldInfo<D extends Database, T extends TableName<D>, C extends AnyCalculatedValues> = {
    key: keyof C & string;
    dependsOn: [keyof RemoteRow<D, T>, TableName<D>][];
    calculation: (row: LocalRow<D, T, C>, dependencies: DependentRows<D, T>) => C[keyof C] | Promise<C[keyof C]>;
};

export class SupaSyncTable<D extends Database, T extends TableName<D>, C extends AnyCalculatedValues = NoCalculatedValues, IA = {}> {
    
    public readonly _storeAdapter: IDBStoreAdapter<LocalRow<D, T, C>, 'id'>;
    public readonly _pendingAdapter: IDBStoreAdapter<PendingUpdate<D, T>, '__index'>;
    public readonly updatedAtKey: Column<D, T>;
    public readonly deletedKey: BooleanColumn<D, T>;
    public readonly indexNeedsUpgrade: boolean;
    public readonly searchNeedsUpgrade: boolean = false;
    public readonly createOffline: boolean;
    public readonly updateOffline: boolean;
    public readonly indexed: Indexed<D, T>;
    public readonly _summaryInfo: {
        index: IDBSearchIndex;
        adapter: IDBStoreAdapter<SearchNode, 'idx'>;
        toString: (row: LocalRow<D, T, C>) => string;
    } | undefined;
    public readonly _calculatedInfo: CalculatedFieldInfo<D, T, C>[];
    public readonly _reverseDependencies: { table: SupaSyncTable<D, TableName<D>, AnyCalculatedValues, any>, key: string }[] = [];
    
    public readonly idKeys: ReadonlyArray<IdColumn<D, T>>;
    public readonly hasCompositeKeys: boolean;
    
    public readonly getId: (row: RemoteRow<D, T>) => number;
    
    private sendPendingTimeout?: ReturnType<typeof setTimeout> | undefined;
    private readonly _dataSynced = new DeferredPromise<void>();
    public readonly dataSynced = this._dataSynced.promise;
    private readonly _cascadeSynced = new DeferredPromise<void>();
    public readonly cascadeSynced = this._cascadeSynced.promise;

    constructor(
        public readonly name: T,
        private readonly supabaseClient: SupabaseClient<D>,
        private readonly onlineState: AsyncState<boolean>,
        private readonly tablesByName: { [T2 in TableName<D>]: SupaSyncTable<D, T2, any, any> },
        public readonly info: SupaSyncTableInfo<D, T, C> & IA,
        private readonly resync: () => Promise<void>,
    ) {
        this.idKeys = info.idKeys ? (Array.isArray(info.idKeys) ? info.idKeys : [info.idKeys]) : ['id'] as IdColumn<D, T>[];
        this.hasCompositeKeys = this.idKeys.length > 1;
        const firstIdKey = this.idKeys[0];
        this.getId = this.hasCompositeKeys
            ? getCombinedIdFn(this.idKeys)
            : (row: RemoteRow<D, T>) => row[firstIdKey] as number;
        this.updatedAtKey = info.updatedAtPath ?? 'updated_at';
        this.deletedKey = info.deletedPath ?? 'deleted' as BooleanColumn<D, T>;
        this.createOffline = info.createOffline ?? false;
        this.updateOffline = info.updateOffline ?? true;
        this._calculatedInfo = info.calculated
            ? Object.entries(info.calculated).map(
                ([key, { dependsOn, calculation }]) => ({ key, dependsOn: Object.entries(dependsOn ?? {}), calculation }))
            : [];
        this.indexed = info.indexed ?? {};
        if (info.getSummaryString) {
            const adapter = new IDBStoreAdapter<SearchNode, 'idx'>(name + SEARCH_SUFFIX, 'idx');
            this._summaryInfo = {
                index: new IDBSearchIndex(adapter),
                adapter,
                toString: info.getSummaryString,
            };
        }
        this.onlineState = onlineState;
        this._storeAdapter = new IDBStoreAdapter<LocalRow<D, T, C>, 'id'>(name, 'id');
        this._pendingAdapter = new IDBStoreAdapter<PendingUpdate<D, T>, '__index'>(name + PENDING_SUFFIX, '__index');
        this.indexNeedsUpgrade = localStorage.getItem(INDEXED_FIELDS_PREFIX + name) !== serializeIndexedFields(this.indexed);
        const indexEntries = Object.entries(this.indexed) as [Column<D, T>, IndexType][];
        const boolKeys = indexEntries.filter(([_, t]) => t === Boolean).map(([key, _]) => key);
        if (boolKeys.length) {
            this._storeAdapter.mappingInFunction = (row: LocalRow<D, T, C>) => {
                for (const key of boolKeys)
                    if (key in row)
                        row[key] = idbBoolToNumber(row[key] as boolean | null) as any;
                return row;
            };
            this._storeAdapter.mappingOutFunction = (row: LocalRow<D, T, C>) => {
                for (const key of boolKeys)
                    if (key in row)
                        row[key] = idbNumberToBool(row[key] as number | null) as any;
                return row;
            };
        }
        if (this._summaryInfo) {
            const { index, toString } = this._summaryInfo;
            this.searchNeedsUpgrade = localStorage.getItem(SEARCH_VERSION_PREFIX + name) !== (this.info.searchIndexVersion ?? 0).toString();
            this._storeAdapter.writeCallback = async changes => {
                const updates = changes.map(change => {
                    const { new: newRow, old: oldRow } = change;
                    const row = oldRow ?? newRow!;
                    const oldText = oldRow ? toString(oldRow).toLowerCase() : undefined;
                    const newText = newRow ? toString(newRow).toLowerCase() : undefined;
                    return { old: oldText, new: newText, key: this.getId(row) };
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
            const indexedFieldsStr = serializeIndexedFields(this.indexed);
            localStorage.setItem(INDEXED_FIELDS_PREFIX + this.name, indexedFieldsStr);
        }
        if (this.searchNeedsUpgrade) {
            localStorage.setItem(SEARCH_VERSION_PREFIX + this.name, (this.info.searchIndexVersion ?? 0).toString());
            if (this._summaryInfo) {
                const { index, toString } = this._summaryInfo;
                await index.clear();
                const allItems = await this.readAll().dontWaitForDataSync().get();
                const updates = allItems.map(item => ({
                    old: undefined,
                    new: toString(item).toLowerCase(),
                    key: this.getId(item),
                }));
                await index.update(updates);
            }
        }
        this.sendPending();
    }

    public async _sync(lastUpdatedAt: string, awaitDependentUpdates = true) {
        let query = this.supabaseClient.from(this.name)
            .select('*')
            .gt(this.updatedAtKey, lastUpdatedAt);
        if (lastUpdatedAt.startsWith('1970-') && this.info.deletable)
            query = query.eq(this.deletedKey, false as any);
        await this.onlineState.get();
        const { data } = await query.throwOnError();
        let dependentUpdatesPromise: Promise<void> = Promise.resolve();
        if (data.length) {
            const changes = await this._writeAndDelete(data, true);
            if (changes?.length) {
                this._storeAdapter.onChange.emit(changes);
                dependentUpdatesPromise = this._updateDependentCalculatedValues(changes);
            }
        }
        this._dataSynced.resolve();
        const cascadeSyncedPromise = dependentUpdatesPromise.then(
            () => this._cascadeSynced.settle(),
            error => this._cascadeSynced.settle(error),
        );
        if (awaitDependentUpdates) await cascadeSyncedPromise;
    }
    
    public read(id: IDBValidKey): IDBRead<D, T, C, LocalRow<D, T, C> | null> {
        return new IDBRead(this._storeAdapter, this.cascadeSynced, [id], rows => rows.length ? rows[0] : null);
    }

    public readMany(ids: IDBValidKey[]): IDBRead<D, T, C, LocalRow<D, T, C>[]> {
        return new IDBRead(this._storeAdapter, this.cascadeSynced, ids, rows => rows);
    }

    public readAll(): IDBRead<D, T, C, LocalRow<D, T, C>[]> {
        return new IDBRead(this._storeAdapter, this.cascadeSynced, undefined, rows => rows);
    }

    public find(): IDBFilterBuilder<D, T, C, LocalRow<D, T, C>[]> {
        return new IDBFilterBuilder(this._storeAdapter, this._summaryInfo?.index, rows => rows, this.indexed);
    }
    
    public findKeys(): IDBFilterBuilder<D, T, C, LocalRow<D, T, C>[]> {
        return new IDBFilterBuilder(this._storeAdapter, this._summaryInfo?.index, rows => rows, this.indexed);
    }

    public findOne(): IDBFilterBuilder<D, T, C, LocalRow<D, T, C> | null> {
        return new IDBFilterBuilder(this._storeAdapter, this._summaryInfo?.index, rows => rows.length ? rows[0] : null, this.indexed);
    }

    public async insert<I extends Insert<D, T> | Insert<D, T>[]>(
        row: I
    ): Promise<I extends Insert<D, T>[] ? LocalRow<D, T, C>[] : LocalRow<D, T, C>> {
        await this.dataSynced;
        const isArray = Array.isArray(row);
        const rows = (isArray ? row : [row]) as Insert<D, T>[];
        if (this.createOffline) {
            if (!this.hasCompositeKeys) {
                const idKey = this.idKeys[0];
                for (const row of rows)
                    row[idKey] ??= getRandomId();
            }
            for (const row of rows) {
                row.__new = true;
            }
            const rowsWithCalculatedValues = await this.addCalculatedValues(rows);
            this._storeAdapter.writeMany(rowsWithCalculatedValues as Insert<D, T>[]);
            await this.writePending(rows);
            return (isArray
                ? rowsWithCalculatedValues
                : rowsWithCalculatedValues[0]) as I extends Insert<D, T>[] ? LocalRow<D, T, C>[] : LocalRow<D, T, C>;
        } else {
            if (!this.hasCompositeKeys) {
                const idKey = this.idKeys[0];
                if (rows.some(r => r[idKey] == null)) {
                    let largestId = await this.findLargestId() ?? 0;
                    for (const row of rows as PendingUpdate<D, T>[])
                        if (row[idKey] == null) {
                            row[idKey] = ++largestId;
                            row.__new = true;
                        }
                }
            }
            const { data } = await this.supabaseClient.from(this.name)
                .insert(rows)
                .select("*")
                .throwOnError();
            const rowsWithCalculatedValues = await this.addCalculatedValues(data as LocalRow<D, T, C>[]);
            await this._storeAdapter.writeMany(rowsWithCalculatedValues);
            return (isArray
                ? rowsWithCalculatedValues
                : rowsWithCalculatedValues[0]) as I extends Insert<D, T>[] ? LocalRow<D, T, C>[] : LocalRow<D, T, C>;
        }
    }

    public async update(update: Update<D, T> | Update<D, T>[], debounce?: number) {
        await this.dataSynced;
        const updates = Array.isArray(update) ? update : [update];
        const missingIds = updates.filter(u => !this.getId(u));
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

    public async delete(row: RemoteRow<D, T>) {
        let query = (this.updateOffline
            ? this.supabaseClient.from(this.name).update({ [this.deletedKey]: true } as any)
            : this.supabaseClient.from(this.name).delete());
        for (const idKey of this.idKeys)
            query = query.eq(idKey, row[idKey] as any);
        await Promise.all([
            this._storeAdapter.delete(this.getId(row)),
            query.throwOnError()
        ]);
    }
    
    public async findLargestId() {
        return this._storeAdapter.findLargestId();
    }

    public async _writeAndDelete(rows: Update<D, T>[], alwaysGetChanges = false) {
        const { matched: deleted, unmatched: updated } = classifyArray(rows, row => row[this.deletedKey]);
        const rowsWithCalc = await this.addCalculatedValues(updated);
        return await (this._storeAdapter.onChange.hasSubscriptions || alwaysGetChanges
            ? this._storeAdapter.writeAndGet(rowsWithCalc, deleted.map(row => this.getId(row)))
            : this._storeAdapter.writeMany(rowsWithCalc, deleted.map(row => this.getId(row))));
    }

    public async _updateDependentCalculatedValues(changes: Change<any>[]) {
        if (!this._reverseDependencies.length) return;
        const ids = changes.map(change => this.getId(change.old ?? change.new));
        await Promise.all(this._reverseDependencies.map(async target => {
            await target.table.dataSynced;
            const rows = await target.table.find().in(target.key, ids).get();
            if (!rows.length) return;
            const updatedRows = await target.table.addCalculatedValues(rows);
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
                const id = this.getId(pendingUpdate);
                const existing = pendingById.get(id);
                pendingById.set(id, existing ? Object.assign(existing, pendingUpdate) : pendingUpdate);
            }
            const sendUpdates = Array.from(pendingById.values());
            for (const update of sendUpdates) delete update.__index;
            const sent = await this.trySendPending(sendUpdates);
            if (!sent) {
                setTimeout(() => this.sendPending(iteration + 1), Math.min(iteration * 3000, 15000));
                return;
            }
            await this._pendingAdapter.deleteMany(indexes);
        });
    }

    private async trySendPending(rows: PendingUpdate<D, T>[]): Promise<boolean> {
        if (!rows.length) return true;
        if (!this.onlineState.unsafeGet()) return false;
        try {
            const { matched: inserts, unmatched: updates } = classifyArray<Insert<D, T>, Update<D, T>>(rows, row => {
                const isNew = row.__new;
                if (isNew) {
                    delete row.__new;
                    row[this.deletedKey] = false;
                }
                delete row.__index;
                delete row._calculated;
                if (this.hasCompositeKeys && 'id' in row) delete row.id;
                return isNew;
            });
            await Promise.all([
                inserts.length ? this.supabaseClient.from(this.name).upsert(inserts).throwOnError() : Promise.resolve(),
                Promise.all(updates.map(async row => {
                    let query = this.supabaseClient.from(this.name).update(row);
                    for (const idKey of this.idKeys)
                        query = query.eq(idKey, row[idKey]);
                    await query.single().throwOnError();
                })),
            ]);
            return true;
        } catch (error: any) {
            if (error.code === 'PGRST204') this.resync();
            console.error("Error sending updates:", error);
            return false;
        }
    }

    private async addCalculatedValues(rows: RemoteRow<D, T>[]): Promise<LocalRow<D, T, C>[]> {
        if (!rows.length) return [];
        const rowsWithCalc = rows as LocalRow<D, T, C>[];
        if (this.hasCompositeKeys || !('id' in rows[0]))
            for (const row of rowsWithCalc)
                row.id = this.getId(row);
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
                rowsWithCalc.forEach((row: LocalRow<D, T, C>, index) => {
                    const calculated = row._calculated ??= {} as C;
                    calculated[field.key] = values[index] as any;
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
            await dependency.table.dataSynced;
            const ids = [...dependency.ids];
            if (!ids.length) return;
            const rows = await dependency.table.find().in('id', ids).get();
            dependency.rowsById = Object.fromEntries(rows.map(row => [row.id as number, row]));
        }));
        return dependencies;
    }
}
