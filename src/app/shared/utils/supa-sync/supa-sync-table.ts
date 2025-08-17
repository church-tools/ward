import { SupabaseClient } from "@supabase/supabase-js";
import { Observable } from "rxjs";
import { AsyncState } from "../async-state";
import { IDBFilterBuilder } from "./idb-filter-builder";
import { IDBStoreAdapter } from "./idb-store-adapter";
import type { Column, Database, Insert, Row, SupaSyncTableInfo, TableName, Update } from "./supa-sync.types";

function getRandomId() {
    return Date.now() * 100000 + Math.floor(Math.random() * 100000);
}

export function getPendingStoreName(tableName: TableName<Database>) {
    return tableName + '_pending';
}

// zu Table umbenennen und Logik hier einfügen
export class SupaSyncTable<D extends Database, T extends TableName<D>, InfoAdditions> {

    public readonly storeAdapter: IDBStoreAdapter<Row<D, T>>;
    public readonly idKey: Column<D, T>;
    private readonly pendingAdapter: IDBStoreAdapter<Update<D, T>>;
    private readonly createOffline: boolean;
    private readonly updateOffline: boolean;

    constructor(
        private readonly tableName: T,
        private readonly supabaseClient: SupabaseClient<D>,
        private readonly onlineState: AsyncState<boolean>,
        public readonly info: SupaSyncTableInfo<D, T> & InfoAdditions
    ) {
        this.info = info;
        this.idKey = info.idPath ?? 'id';
        this.createOffline = info.createOffline ?? true;
        this.updateOffline = info.updateOffline ?? true;
        this.onlineState = onlineState;
        this.storeAdapter = new IDBStoreAdapter<Row<D, T>>(tableName);
        this.pendingAdapter = new IDBStoreAdapter<any>(getPendingStoreName(tableName));
        this.sendPending();
    }

    public init(idb: Promise<IDBDatabase>) {
        this.storeAdapter.init(idb);
        this.pendingAdapter.init(idb);
    }
    
    public async read(id: number) {
        const row = await this.storeAdapter.read(id);
        if (row) return row;
        await this.storeAdapter.initialized.get();
        return this.storeAdapter.read(id);
    }

    public async readAll() {
        await this.storeAdapter.initialized.get();
        return await this.storeAdapter.readAll();
    }

    public observe(id: number) {
        return new Observable<Row<D, T>>(observer => {
            this.storeAdapter.read(id)
                .then(row => observer.next(row))
                .catch(err => observer.error(err));
            const writeSubscription = this.storeAdapter.onWrite.subscribe(row => {
                if (row.id === id)
                    observer.next(row);
            });
            return () => writeSubscription.unsubscribe();
        });
    }

    public find(): IDBFilterBuilder<D, T, Row<D, T>[]> {
        return new IDBFilterBuilder<D, T, Row<D, T>[]>(this.storeAdapter,
            rows => rows);
    }

    public findOne(): IDBFilterBuilder<D, T, Row<D, T> | null> {
        return new IDBFilterBuilder<D, T, Row<D, T> | null>(this.storeAdapter,
            rows => rows[0] ?? null);
    }

    public async insert(row: Insert<D, T> | Insert<D, T>[]): Promise<Row<D, T>[]> {
        await this.storeAdapter.initialized.get();
        const rows = Array.isArray(row) ? row : [row];
        if (this.createOffline) {
            for (const row of rows)
                row.id ??= getRandomId();
            this.storeAdapter.writeMany(rows);
            await this.writePending(rows);
            return rows;
        } else {
            const { data } = await this.supabaseClient.from(this.tableName)
                .insert(rows)
                .select("*")
                .throwOnError();
            await this.storeAdapter.writeMany(rows);
            return data;
        }
    }

    public async update(update: Update<D, T> | Update<D, T>[]) {
        await this.storeAdapter.initialized.get();
        const updates = Array.isArray(update) ? update : [update];
        if (this.updateOffline) {
            await Promise.all([
                this.storeAdapter.lock(async () => {
                    const rows = await this.storeAdapter.readMany(updates.map(update => update.id));
                    for (let i = 0; i < updates.length; i++) {
                        const existingRow = rows[i];
                        Object.assign(existingRow ?? {}, updates[i]);
                    }
                    await this.storeAdapter.writeMany(rows);
                }),
                this.writePending(updates),
            ]);
        } else {
            const { data } = await this.supabaseClient.from(this.tableName)
                .upsert(updates)
                .select("*")
                .throwOnError();
            for (const row of data) {
                this.storeAdapter.write(row);
            }
        }
        await this.storeAdapter.writeMany(updates);
    }

    public async delete(row: Row<D, T> | number | string) {
        const id = typeof row === 'object' ? row[this.idKey] : row as any;
        if (this.updateOffline) {
            await this.supabaseClient.from(this.tableName).delete()
                .eq(this.idKey, id).throwOnError();
        }
        return this.storeAdapter.delete(id);
    }
    
    public async findLargestId() {
        return this.storeAdapter.findLargestId();
    }

    private async writePending(rows: Update<D, T>[]) {
        await this.pendingAdapter.writeMany(rows);
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
            if (this.createOffline) {
                await this.supabaseClient.from(this.tableName).upsert(rows).throwOnError();
            } else {
                await Promise.all(rows.map(async row => {
                    const id = row.id;
                    delete row.id;
                    await this.supabaseClient.from(this.tableName)
                        .update(row)
                        .eq("id", id)
                        .throwOnError();
                }));
            }
            return true;
        } catch (error) {
            console.error("Error sending updates:", error);
            return false;
        }
    }
}
