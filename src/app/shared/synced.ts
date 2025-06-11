import { Observable as LSObservable, observable, RemoveObservables } from "@legendapp/state";
import { ObservablePersistIndexedDB } from "@legendapp/state/persist-plugins/indexeddb";
import { SyncedCrudReturnType } from "@legendapp/state/sync-plugins/crud";
import { configureSyncedSupabase, syncedSupabase } from "@legendapp/state/sync-plugins/supabase";
import { SupabaseClient, User } from "@supabase/supabase-js";
import { Observable } from "rxjs";
import { IdOf, RowOf, TableName } from "../../../database-table.types";
import { Database } from "../../../database.types";
import { AsyncValue } from "./utils/async-value";
import { generateUUIDv7 } from "./utils/crypto-utils";
import { signal } from "@angular/core";

configureSyncedSupabase({
    generateId: generateUUIDv7,
});

type Records<T extends TableName> = Record<number, RowOf<T>>;
type KeyWithValue<T, V> = { [K in keyof T]: T[K] extends V ? K : never; }[keyof T];

export class Synced<T extends TableName> {

    private readonly synced = new AsyncValue<LSObservable<Record<IdOf<T>, RowOf<T>>>>();

    constructor(
        private readonly supabase: SupabaseClient<Database>,
        private readonly tableName: T,
        private readonly idField: KeyWithValue<RowOf<T>, string | number>,
        private readonly indexField?: KeyWithValue<RowOf<T>, number>,
    ) {

    }

    public setup(user: User) {
        const synced = syncedSupabase({
            supabase: this.supabase,
            collection: this.tableName,
            debounceSet: 500,
            realtime: true,
            persist: { 
                name: this.tableName, 
                retrySync: true,
                plugin: new ObservablePersistIndexedDB({
                    databaseName: 'ward-tools-' + user.id,
                    version: 1,
                    tableNames: [this.tableName]
                })
            },
            changesSince: 'last-sync',
            retry: { infinite: true },
            fieldId: this.idField as string,
            fieldCreatedAt: 'created_at',
            fieldUpdatedAt: 'updated_at',
            fieldDeleted: 'deleted', 
        })
        this.synced.set(observable(synced));
    }

    public async getAllById(): Promise<Records<T>> {
        const synced = await this.synced.get();
        return synced.get() || {};
    }
    
    public syncAll() {
        return new Observable<Records<T>>(subscriber => {
            let unsubscribe: (() => void) | undefined;
            this.synced.get()
            .then(synced => {
                const initialData = synced.get();
                if (initialData) subscriber.next(initialData);
                unsubscribe = synced.onChange(params => {
                    // todo handle changes
                    const data = synced.get();
                    subscriber.next(data);
                });
            });
            return () => unsubscribe?.();
        });
    }

    public asSignal(filter?: (row: RowOf<T>) => boolean) {
        const sig = signal<RowOf<T>[]>([]);
        this.synced.get()
        .then(synced => {
            const rows = this.getRows(synced.get(), filter);
            sig.set(rows);
            synced.onChange(() => {
                const rows = this.getRows(synced.get(), filter);
                sig.set(rows);
            });
        });
        return sig;
    }

    private getRows(synced: Records<T> | undefined, filter?: (row: RowOf<T>) => boolean): RowOf<T>[] {
        let rows = Object.values(synced || {}) as RowOf<T>[];
        if (filter) rows = rows.filter(filter);
        const indexField = this.indexField;
        if (!indexField) return rows;
        return rows.sort((a, b) => {
            const aIndex = a[indexField] as number;
            const bIndex = b[indexField] as number;
            return aIndex - bIndex;
        });
    }
    
    private sort(rows: RowOf<T>[]) {
    }
}