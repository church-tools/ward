import { inject, Injectable, Injector, signal } from "@angular/core";
import { User } from "@supabase/supabase-js";
import { Observable, Subscription } from "rxjs";
import { Database } from "../../../../database";
import { SupabaseService } from "../../shared/supabase.service";
import { Insert, KeyWithValue, Row, TableName, Update } from "../../shared/types";
import { AsyncState } from "../../shared/utils/async-state";
import { filterMap } from "../../shared/utils/map-utils";
import { Changes, SupaSyncTable } from "../../shared/utils/supa-sync/table/supa-sync-table";

export type RowMap<T extends TableName> = Changes<Database, T>;

export async function getTableService<T extends TableName>(injector: Injector, tableName: T) {
    const service = await (async () => {
        switch (tableName) {
            case 'agenda': return (await import('../agenda/agenda.service')).AgendaService;
            case 'task': return (await import('../task/task.service')).TaskService;
            case 'profile': return (await import('../profile/profile.service')).ProfileService;
            default: throw new Error(`No service found for table: ${tableName}`);
        }
    })();
    return <TableService<T>>injector.get(<InstanceType<any>>service);
}

@Injectable({ providedIn: 'root' })
export abstract class TableService<T extends TableName> {

    protected readonly supabase = inject(SupabaseService);
    protected readonly sync = new AsyncState<SupaSyncTable<Database, T>>();

    abstract readonly tableName: T;
    abstract readonly orderField: KeyWithValue<Row<T>, number> | null;
    abstract readonly createOffline: boolean;
    readonly idKey = 'id' as KeyWithValue<Row<T>, number>;

    public get direct() { return this.supabase.client.from(this.tableName); }

    constructor() {
        this.supabase.sync.get()
        .then(supaSync => {
            this.sync.set(supaSync.getTable(this.tableName, this.createOffline, true));
        });
    }

    public async get(id: number): Promise<Row<T> | undefined> {
        const sync = await this.sync.get();
        return sync.read(id);
    }

    public observe(filter: (row: Row<T>) => boolean): Observable<Row<T> | undefined> {
        return new Observable<Row<T> | undefined>(subscriber => {
            let subscription: Subscription | undefined;
            this.sync.get()
            .then(sync => {
                subscription = sync.observeAll().subscribe(changes => {
                    for (const row of Object.values(changes))
                        if (row && filter(row))
                            subscriber.next(row);
                });
            });
            return () => subscription?.unsubscribe();
        });
    }

    public observeMany(filter?: (row: Row<T>) => boolean): Observable<RowMap<T>> {
        return new Observable<RowMap<T>>(subscriber => {
            let subscription: Subscription | undefined;
            this.sync.get()
            .then(sync => {
                subscription = sync.observeAll().subscribe(changes => {
                    if (filter)
                        changes = filterMap(changes, row => row != null && filter(row));
                    if (changes.size)
                        subscriber.next(changes);
                });
            });
            return () => subscription?.unsubscribe();
        });
    }

    public manyAsSignal(filter?: (row: Row<T>, user: User) => boolean) {
        const sig = signal<RowMap<T>>(new Map());
        this.sync.get()
        .then(sync => {
            let subscription = sync.observeAll().subscribe(changes => {
                if (filter)
                    changes = filterMap(changes, row => row != null && filter(row, sync.user));
                if (changes.size)
                    sig.update(current => Object.assign(current, changes));
            });
        });
        return sig;
    }

    public asSignal(filter: (row: Row<T>, user: User) => boolean) {
        const sig = signal<Row<T> | undefined>(undefined);
        this.sync.get()
        .then(sync => {
            let subscription = sync.observeAll().subscribe(changes => {
                const row = changes.values().find(row => row && filter(row, sync.user));
                if (row) sig.set(row);
            });
        });
        return sig;
    }

    public async insertRow(row: Insert<T>) {
        const sync = await this.sync.get();
        return await sync.create(row);
    }

    public async updateRows(updates: Update<T>[]) {
        const sync = await this.sync.get();
        await sync.updateMany(updates);
    }

    public async create(row: Insert<T>) {
        const sync = await this.sync.get();
        return await sync.create(row);
    }

    public async upsert(rows: Insert<T>[]) {
        await this.direct.upsert(<any[]>rows).throwOnError();
    }

    abstract toString(row: Row<T>): string;
    
    private async setup() {
        

    }

    private async firstFreeId() {
        const sync = await this.sync.get();
        const largestExisting = await sync.findLargestId();
        return (largestExisting ?? 0) + 1;
    }
}
