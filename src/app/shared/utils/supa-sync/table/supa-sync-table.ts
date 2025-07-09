import { SupabaseClient, User } from "@supabase/supabase-js";
import { Observable } from "rxjs";
import { AsyncState } from "../../async-state";
import { Aggregator } from "../../flow-control-utils";
import { Database, TableName } from "../supa-sync";
import { IDBStoreAdapter } from "./idb-store-adapter";

function getRandomId() {
    return Date.now() * 100000 + Math.floor(Math.random() * 100000);
}

export type Row<D extends Database, T extends TableName<D>> = D["public"]["Tables"][T]["Row"];
type Update<D extends Database, T extends TableName<D>> = D["public"]["Tables"][T]["Update"];
type Insert<D extends Database, T extends TableName<D>> = D["public"]["Tables"][T]["Insert"];
export type Changes<D extends Database, T extends TableName<D>> = Record<number, Row<D, T> | null>;

export class SupaSyncTable<D extends Database, T extends TableName<D>> {

    private readonly pendingAggregator = new Aggregator<Update<D, T>>(500);

    constructor(
        private readonly supabase: SupabaseClient<D>,
        public readonly user: User,
        private readonly isOnline: AsyncState<boolean>,
        private readonly storeAdapter: IDBStoreAdapter<Row<D, T>>,
        private readonly pendingStoreAdapter: IDBStoreAdapter<Update<D, T>>,
        private readonly tableName: T,
        private readonly createOffline: boolean,
        private readonly updateOffline: boolean,
    ) {
        this.sendPending();
    }

    public async create(row: Insert<D, T>) {
        await this.storeAdapter.initialized.get();
        if (this.createOffline) {
            row.id ??= getRandomId();
            await this.writePending([row]);
        } else {
            const { data } = await this.supabase.from(this.tableName)
                .insert(row)
                .select("*")
                .single()
                .throwOnError();
            row = data;
        }
        this.storeAdapter.write(row);
        return row as Row<D, T>;
    }

    public async read(id: number) {
        const row = await this.storeAdapter.read(id);
        if (row) return row;
        await this.storeAdapter.initialized.get();
        return this.storeAdapter.read(id);
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

    public observeMany(ids: number[]) {
        return new Observable<Changes<D, T>>(observer => {
            this.storeAdapter.readMany(ids)
                .then(rows => observer.next(Object.fromEntries(rows.filter(row => row?.id).map(row => [row!.id, row]))))
                .catch(err => observer.error(err));
            const idsSet = new Set(ids);
            const writeSubscription = this.storeAdapter.onWrite.subscribe(row => {
                if (idsSet.has(row.id))
                    observer.next({ [row.id]: row });
            });
            return () => writeSubscription.unsubscribe();
        });
    }

    public observeAll() {
        return new Observable<Changes<D, T>>(observer => {
            this.storeAdapter.readAll()
                .then(rows => observer.next(Object.fromEntries(rows.map(row => [row!.id, row]))))
                .catch(err => observer.error(err));
            const writeSubscription = this.storeAdapter.onWrite.subscribe(row => {
                observer.next({ [row.id]: row });
            });
            return () => writeSubscription.unsubscribe();
        });
    }

    public async findLargestId() {
        return this.storeAdapter.findLargestId();
    }

    public async update(update: Update<D, T>) {
        await this.storeAdapter.initialized.get();
        if (this.updateOffline) {
            const [existingRow] = await Promise.all([
                this.storeAdapter.read(update.id),
                this.writePending([update]),
            ]);
            update = Object.assign(existingRow ?? {}, update);
        } else {
            const { data } = await this.supabase.from(this.tableName)
                .update(update)
                .eq("id", update.id)
                .select("*")
                .throwOnError();
            update = data[0];
        }
        await this.storeAdapter.write(update);
    }

    public async updateMany(updates: Update<D, T>[]) {
        await this.storeAdapter.initialized.get();
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
            const { data } = await this.supabase.from(this.tableName)
                .upsert(updates)
                .select("*")
                .throwOnError();
            for (const row of data) {
                this.storeAdapter.write(row);
            }
        }
        await this.storeAdapter.writeMany(updates);
    }

    private async writePending(rows: Update<D, T>[]) {
        await this.pendingStoreAdapter.writeMany(rows);
        this.sendPending();
    }
    
    private async sendPending(iteration = 1) {
        await this.isOnline.get();
        await this.pendingStoreAdapter.lock(async () => {
            const pendingUpdates = await this.pendingStoreAdapter.readAll();
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
            await this.pendingStoreAdapter.deleteMany(indexes);
        });
    }

    private async trySend(rows: Update<D, T>[]) {
        if (!this.isOnline.unsafeGet()) return false;
        try {
            if (this.createOffline) {
                await this.supabase.from(this.tableName).upsert(rows).throwOnError();
            } else {
                await Promise.all(rows.map(async row => {
                    const id = row.id;
                    delete row.id;
                    await this.supabase.from(this.tableName)
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