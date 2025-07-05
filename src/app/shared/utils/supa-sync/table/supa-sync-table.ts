import { Observable } from "rxjs";
import { IDBStoreAdapter } from "./idb-store-adapter";
import { Database, TableName } from "../supa-sync";
import { AsyncState } from "../../async-state";
import { SupabaseClient } from "@supabase/supabase-js";

function getRandomId() {
    return Date.now() * 100000 + Math.floor(Math.random() * 100000);
}

export type Row<D extends Database, T extends TableName<D>> = D["public"]["Tables"][T]["Row"];
type Update<D extends Database, T extends TableName<D>> = D["public"]["Tables"][T]["Update"];
type Insert<D extends Database, T extends TableName<D>> = D["public"]["Tables"][T]["Insert"];

export class SupaSyncTable<D extends Database, T extends TableName<D>> {

    private sendPendingInterval: NodeJS.Timeout | undefined;

    constructor(
        private readonly supabase: SupabaseClient<D>,
        private readonly isOnline: AsyncState<boolean>,
        private readonly storeAdapter: IDBStoreAdapter<Row<D, T>>,
        private readonly pendingStoreAdapter: IDBStoreAdapter<Update<D, T>>,
        private readonly tableName: T,
        private readonly createOffline: boolean,
        private readonly updateOffline: boolean,
    ) {
        this.isOnline.get()
        .then(() => this.sendPending());
    }

    public async create(row: Insert<D, T>) {
        if (this.createOffline) {
            row.id ??= getRandomId();
            this.writePending([row]);
        } else {
            const { data } = await this.supabase.from(this.tableName)
                .insert(row)
                .select("*")
                .single()
                .throwOnError();
            row = data;
        }
        this.storeAdapter.write(row);
        return row;
    }

    public async read(ids: number[]) {
        return new Observable<Row<D, T>[]>(observer => {
            let unsubscribe: (() => void) | undefined;
            this.storeAdapter.readMany(ids).then(rows => {
                observer.next(rows);
                observer.complete();
            }).catch(err => {
                observer.error(err);
            });
            return () => unsubscribe?.();
        });
    }

    public async update(update: Update<D, T>) {
        if (this.updateOffline) {
            this.writePending([update]);
        } else {
            const { data } = await this.supabase.from(this.tableName)
                .update(update)
                .eq("id", update.id)
                .select("*")
                .throwOnError();
            update = data[0];
        }
        
        this.storeAdapter.write(update);
        return update;
    }

    private async writePending(rows: Update<D, T>[]) {
        const keys = rows.map(row => row.id as number);
        this.storeAdapter.lock(async () => {
            const pending = await this.pendingStoreAdapter.readMany(keys);
            for (let i = 0; i < rows.length; i++)
                pending[i] = Object.assign(pending[i] ?? {}, rows[i]);
            await this.pendingStoreAdapter.write(pending);
        });

        // start interval to send pending items
    }
    
    private async sendPending() {
        if (this.sendPendingInterval) {
            clearInterval(this.sendPendingInterval);
            this.sendPendingInterval = undefined;
        }
        await this.isOnline.get();
        // this.sendPendingInterval = setInterval(async () => {
        //     const storeName = getPendingStoreName(this.tableName);
        //     const idb = await this.service.idb.get();
        //     await idb.lock(storeName, async () => {
        //         const pending = await idb.read(storeName);
        //         if (!pending.length) return;
        //         await this.service.supabase.from(this.tableName)
        //             .insert(pending)
        //             .select("*")
        //             .throwOnError();
        //         await idb.delete(storeName);
        //     });
        // }, 1000);
    }
}