import { ListenerParams, Observable, observable, ObservableObject } from "@legendapp/state";
import { ObservablePersistIndexedDB } from "@legendapp/state/persist-plugins/indexeddb";
import { ObservablePersistIndexedDBPluginOptions } from "@legendapp/state/sync";
import { syncedSupabase } from "@legendapp/state/sync-plugins/supabase";
import { SupabaseClient, User } from "@supabase/supabase-js";

function generateUUIDv7() {
    const now = Date.now(); // Current timestamp in milliseconds
    const unixTime = Math.floor(now / 1000).toString(16).padStart(8, '0'); // 32-bit seconds
    const subSeconds = ((now % 1000) * 0x1000).toString(16).padStart(5, '0'); // 12-bit sub-seconds

    const random = crypto.getRandomValues(new Uint8Array(10)); // 80 bits of randomness
    const randomHex = Array.from(random, (byte) => byte.toString(16).padStart(2, '0')).join('');

    return `${unixTime}-${subSeconds}-7${randomHex.slice(0, 3)}-${randomHex.slice(3, 7)}-${randomHex.slice(7)}`;
}

type Database = { public: { Tables: { [key: string]: any } } };
type IdOf<D extends Database, T extends string> = Row<D, T> extends { id: number } ? number : string;
type Row<D extends Database, T extends string> = D["public"]["Tables"][T]["Row"] & { id: number };
type Insert<D extends Database, T extends string> = D["public"]["Tables"][T]["Insert"];
type RecordOf<D extends Database, T extends string> = Record<IdOf<D, T>, Row<D, T>>;

export type IDBInfo = ObservablePersistIndexedDBPluginOptions;

export class SupaLegend<D extends Database, T extends string> {

    private readonly supaLegend: Observable<RecordOf<D, T>> & ObservableObject<RecordOf<D, T>>;
    readonly user: User;

    constructor(supabase: SupabaseClient<D>, tableName: T, user: User, idbInfo: IDBInfo) {
        this.user = user;
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
            fieldId: 'id',
            changesSince: 'last-sync',
            fieldCreatedAt: 'created_at',
            fieldUpdatedAt: 'updated_at',
            fieldDeleted: 'deleted',
        }));
        this.supaLegend.get(); // Initialize the observable to ensure it starts fetching data
    }
    
    public get(): RecordOf<D, T> {
        return this.supaLegend.get() as RecordOf<D, T> ?? {};
    }

    public onChange(callback: (params: ListenerParams<RecordOf<D, T>>) => void): () => void {
        return this.supaLegend.onChange(callback);
    }

    public createRow(info: Insert<D, T>) {
        const id = (info['id'] ?? generateUUIDv7()) as IdOf<D, T>;
        const row = (this.supaLegend as any)[id] as Observable<Row<D, T>>;
        const now = new Date().toISOString();
        row.set({ id, created_at: now, updated_at: now, ...info });
    }

    public updateRow(update: Partial<Row<D, T>>, updateFields: (keyof Row<D, T>)[]): void {
        const id = update['id'];
        if (!id) throw new Error(`Update must contain the id`);
        const row = this.supaLegend[id] as Observable<Row<D, T>>;
        row.assign({
            id,
            updated_at: new Date().toISOString(),
            ...Object.fromEntries(updateFields.map(field => [field, update[field]])),
        });
    }
}
