
import { ListenerParams, Observable, observable, ObservableObject } from "@legendapp/state";
import { ObservablePersistIndexedDB } from "@legendapp/state/persist-plugins/indexeddb";
import { ObservablePersistIndexedDBPluginOptions } from "@legendapp/state/sync";
import { configureSyncedSupabase, syncedSupabase } from "@legendapp/state/sync-plugins/supabase";
import { SupabaseClient } from "@supabase/supabase-js";

function generateUUIDv7() {
    const now = Date.now(); // Current timestamp in milliseconds
    const unixTime = Math.floor(now / 1000).toString(16).padStart(8, '0'); // 32-bit seconds
    const subSeconds = ((now % 1000) * 0x1000).toString(16).padStart(5, '0'); // 12-bit sub-seconds

    const random = crypto.getRandomValues(new Uint8Array(10)); // 80 bits of randomness
    const randomHex = Array.from(random, (byte) => byte.toString(16).padStart(2, '0')).join('');

    return `${unixTime}-${subSeconds}-7${randomHex.slice(0, 3)}-${randomHex.slice(3, 7)}-${randomHex.slice(7)}`;
}

configureSyncedSupabase({ generateId: generateUUIDv7 });

type Database = { public: { Tables: { [key: string]: any } } };
type IdOf<D extends Database, T extends string> = Row<D, T> extends { id: number } ? number : string;
type Row<D extends Database, T extends string> = D["public"]["Tables"][T]["Row"];
type RecordOf<D extends Database, T extends string> = Record<IdOf<D, T>, Row<D, T>>;

/**
 * Type that represents an observable row from Legend State.
 * Provides access to all fields as ObservablePrimitive while maintaining the Observable structure.
 */
export type SupaLegendRow<D extends Database, T extends string> = ObservableObject<Row<D, T>>;

export type IDBInfo = ObservablePersistIndexedDBPluginOptions;

export class SupaLegend<D extends Database, T extends string> {

    private readonly supaLegend: Observable<RecordOf<D, T>> & ObservableObject<RecordOf<D, T>>;

    constructor(supabase: SupabaseClient<D>, tableName: T, idbInfo: IDBInfo, idField: string = 'id') {
        this.supaLegend = <any>observable(syncedSupabase({
            supabase,
            collection: tableName,
            persist: {
                name: tableName,
                retrySync: true,
                plugin: new ObservablePersistIndexedDB(idbInfo),
            },
            realtime: true,
            actions: ['create', 'read', 'update', 'delete'],
            debounceSet: 500,
            retry: { infinite: true },
            fieldId: idField,
            changesSince: 'last-sync',
            fieldCreatedAt: 'created_at',
            fieldUpdatedAt: 'updated_at',
            fieldDeleted: 'deleted',
        }));
        this.supaLegend.get(); // Initialize the observable to ensure it starts fetching data
    }

    public get(): RecordOf<D, T> {
        return this.supaLegend.get();
    }

    public onChange(callback: (params: ListenerParams<T>) => void): () => void {
        return this.supaLegend.onChange(callback);
    }
    
    public getRow(id: IdOf<D, T>): SupaLegendRow<D, T> {
        return (this.supaLegend as any)[id];
    }
}
