import { ListenerParams, Observable, observable, ObservableObject, syncState } from "@legendapp/state";
import { ObservablePersistIndexedDB } from "@legendapp/state/persist-plugins/indexeddb";
import { ObservablePersistIndexedDBPluginOptions } from "@legendapp/state/sync";
import { configureSyncedSupabase, syncedSupabase } from "@legendapp/state/sync-plugins/supabase";
import { SupabaseClient, User } from "@supabase/supabase-js";

function getId() {
    return Date.now() * 100000 + Math.floor(Math.random() * 100000);
}

configureSyncedSupabase({
    // generateId: getId,
    fieldId: 'id',
    changesSince: 'last-sync',
    fieldCreatedAt: 'created_at',
    fieldUpdatedAt: 'updated_at',
    fieldDeleted: 'deleted',
    // as: 'Map',
    // updatePartial: true,
});

type Database = { public: { Tables: { [key: string]: any } } };
type Row<D extends Database, T extends string> = D["public"]["Tables"][T]["Row"];
type Insert<D extends Database, T extends string> = D["public"]["Tables"][T]["Insert"];
type RecordOf<D extends Database, T extends string> = Record<number, Row<D, T>>;

export type IDBInfo = ObservablePersistIndexedDBPluginOptions;

export class SupaLegend<D extends Database, T extends string> {

    private readonly supaLegend: Observable<RecordOf<D, T>> & ObservableObject<RecordOf<D, T>>;
    readonly persistLoaded: Promise<void>;
    readonly loaded: Promise<void>;
    readonly user: User;

    constructor(supabase: SupabaseClient<D>, tableName: T, user: User, idbInfo: IDBInfo) {
        this.user = user;
        this.supaLegend = observable(syncedSupabase({
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
        })) as any;
        const state = syncState(this.supaLegend);
        this.persistLoaded = new Promise(resolve => {
            state.onChange(params => { if (params.value?.isPersistLoaded) resolve(); });
        });
        this.loaded = new Promise(resolve => {
            state.onChange(params => { if (params.value?.isLoaded) resolve(); });
        });
        Promise.all([this.persistLoaded, this.loaded])
            .then(() => state.delete());
        this.supaLegend.get(); // Initialize the observable to ensure it starts fetching data
    }
    
    public get(): RecordOf<D, T> {
        return this.supaLegend.get() as RecordOf<D, T> ?? {};
    }

    public onChange(callback: (params: ListenerParams<RecordOf<D, T>>) => void): () => void {
        return this.supaLegend.onChange(callback);
    }

    public insertRow(info: Insert<D, T>) {
        const id: Row<D, T>['id'] = info.id ??= getId();
        info.created_at = info.updated_at = null; // new Date().toISOString();
        const assigned = this.supaLegend[id].set(info);
        return info as Row<D, T>;
    }

    public updateRow(update: Row<D, T>, updateFields: (keyof Row<D, T>)[]): void {
        const id = update.id as Row<D, T>['id'];
        if (!id) throw new Error(`Update must contain the id`);
        this.supaLegend[id].assign({
            id,
            updated_at: new Date().toISOString(),
            ...Object.fromEntries(updateFields.map(field => [field, update[field]])),
        });
    }
}
