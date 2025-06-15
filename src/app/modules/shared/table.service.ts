import { inject, Injectable, signal } from "@angular/core";
import { Observable as LSObservable, observable } from "@legendapp/state";
import { ObservablePersistIndexedDB } from "@legendapp/state/persist-plugins/indexeddb";
import { configureSyncedSupabase, syncedSupabase } from "@legendapp/state/sync-plugins/supabase";
import { User } from "@supabase/supabase-js";
import { Observable } from "rxjs";
import { SupabaseService } from "../../shared/supabase.service";
import { IdOf, Insert, KeyWithValue, Row, TableName } from "../../shared/types";
import { AsyncValue } from "../../shared/utils/async-value";
import { generateUUIDv7 } from "../../shared/utils/crypto-utils";

configureSyncedSupabase({ generateId: generateUUIDv7 });

@Injectable({ providedIn: 'root' })
export abstract class TableService<T extends TableName> {

    private readonly supabase = inject(SupabaseService);
    
    private readonly synced = new AsyncValue<LSObservable<Record<IdOf<T>, Row<T>>>>();

    abstract readonly tableName: T;
    abstract readonly idField: KeyWithValue<Row<T>, string | number>;
    abstract readonly indexField?: KeyWithValue<Row<T>, number> | null;

    public get table() { return this.supabase.client.from(this.tableName); }

    constructor() {
        this.supabase.getSession()
        .then(session => this.setup(session?.user));
    }

    public async getAllById(): Promise<Record<number, Row<T>>> {
        const synced = await this.synced.get();
        return synced.get() || {};
    }

    public syncAll() {
        return new Observable<Record<number, Row<T>>> (subscriber => {
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

    public observe(filter?: (row: Row<T>) => boolean): Observable<Row<T>[]> {
        return new Observable<Row<T>[]>(subscriber => {
            this.synced.get()
            .then(synced => {
                const rows = this.getRows(synced.get(), filter);
                subscriber.next(rows);
                const unsubscribe = synced.onChange(() => {
                    const rows = this.getRows(synced.get(), filter);
                    subscriber.next(rows);
                });
                return () => unsubscribe();
            });
        });
    }

    public asSignal(filter?: (row: Row<T>) => boolean) {
        const sig = signal<Row<T>[]>([]);
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

    public async update(rows: Row<T>[]) {
        const synced = await this.synced.get();
        
    }

    public async upsert(rows: Insert<T>[]) {
        await this.table.upsert(<any[]>rows).throwOnError();
    }

    private getRows(synced: Record<number, Row<T>> | undefined, filter?: (row: Row<T>) => boolean): Row<T>[] {
        let rows = Object.values(synced || {}) as Row<T>[];
        if (filter) rows = rows.filter(filter);
        const indexField = this.indexField;
        if (!indexField) return rows;
        return rows.sort((a, b) => {
            const aIndex = a[indexField] as number;
            const bIndex = b[indexField] as number;
            return aIndex - bIndex;
        });
    }

    abstract toString(row: Row<T>): string;
    
    private setup(user: User | undefined) {
        if (!user) throw 'User not authenticated, syncing will not work';
        const synced = syncedSupabase({
            supabase: this.supabase.client,
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
            fieldId: <string>this.idField,
            fieldDeleted: 'deleted',
            fieldCreatedAt: 'created_at',
            fieldUpdatedAt: 'updated_at',
        })
        this.synced.set(observable(synced));
    }
}