import { inject, Injectable, Injector, signal } from "@angular/core";
import { User } from "@supabase/supabase-js";
import { Observable, Subscription } from "rxjs";
import { Database } from "../../../../database";
import { SupabaseService } from "../../shared/service/supabase.service";
import { Insert, KeyWithValue, Row, TableName, TableQuery, Update } from "../../shared/types";
import { AsyncState } from "../../shared/utils/async-state";
import { filterMap } from "../../shared/utils/map-utils";
import { Changes, SupaSyncTable } from "../../shared/utils/supa-sync/table/supa-sync-table";
import { IDBQueryBuilder } from "../../shared/utils/supa-idb/idb-query-builder";

export type RowMap<T extends TableName> = Changes<Database, T>;

export async function getTableService<T extends TableName>(injector: Injector, tableName: T) {
    const service = await (async () => {
        switch (tableName) {
            case 'agenda': return (await import('../agenda/agenda.service')).AgendaService;
            case 'agenda_section': return (await import('../agenda/section/agenda-section.service')).AgendaSectionService;
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
    protected readonly table = new AsyncState<SupaSyncTable<Database, T>>();

    abstract readonly tableName: T;
    abstract readonly orderField: KeyWithValue<Row<T>, number> | null;
    abstract readonly createOffline: boolean;
    readonly idKey = 'id' as KeyWithValue<Row<T>, number>;

    public get direct() { return this.supabase.client.from(this.tableName); }

    public get query() { return new IDBQueryBuilder(this.table); }

    constructor() {
        this.supabase.sync.get()
        .then(supaSync => {
            this.table.set(supaSync.getTable(this.tableName, this.createOffline, true));
        });
    }

    public async get(id: number): Promise<Row<T> | undefined> {
        const table = await this.table.get();
        return table.read(id);
    }

    public async find(query: TableQuery<T>) {
        const table = await this.table.get();
        const all = await table.readAll();
        const { filter } = query;
        if (filter)
            return all.filter(row => filter(row, table.user));
        return all;
    }

    // New: find by single indexed field (equality)
    public async findByIndex<K extends keyof Row<T>>(index: K, value: Row<T>[K]) {
        const table = await this.table.get();
        return await (table as any).findByIndex(index, value);
    }

    public observe(filter: (row: Row<T>) => boolean): Observable<Row<T> | undefined> {
        return new Observable<Row<T> | undefined>(subscriber => {
            let subscription: Subscription | undefined;
            this.table.get()
            .then(table => {
                subscription = table.observeAll().subscribe(changes => {
                    for (const row of Object.values(changes))
                        if (row && filter(row))
                            subscriber.next(row);
                });
            });
            return () => subscription?.unsubscribe();
        });
    }

    public observeMany(query?: TableQuery<T>): Observable<RowMap<T>> {
        return new Observable<RowMap<T>>(subscriber => {
            let subscription: Subscription | undefined;
            const { filter } = query ?? {};
            this.table.get()
            .then(table => {
                subscription = table.observeAll().subscribe(changes => {
                    if (filter)
                        changes = filterMap(changes, row => row != null && filter(row, table.user));
                    if (changes.size)
                        subscriber.next(changes);
                });
            });
            return () => subscription?.unsubscribe();
        });
    }

    public manyAsSignal(query?: TableQuery<T>) {
        const sig = signal<RowMap<T>>(new Map());
        const { filter } = query ?? {};
        this.table.get()
        .then(table => {
            let subscription = table.observeAll().subscribe(changes => {
                if (filter)
                    changes = filterMap(changes, row => row != null && filter(row, table.user));
                if (changes.size)
                    sig.update(current => Object.assign(current, changes));
            });
        });
        return sig;
    }

    public asSignal(filter: (row: Row<T>, user: User) => boolean) {
        const sig = signal<Row<T> | undefined>(undefined);
        this.table.get()
        .then(sync => {
            let subscription = sync.observeAll().subscribe(changes => {
                const row = changes.values().find(row => row && filter(row, sync.user));
                if (row) sig.set(row);
            });
        });
        return sig;
    }

    public async insertRow(row: Insert<T>) {
        const table = await this.table.get();
        return await table.create(row);
    }

    public async updateRows(updates: Update<T>[]) {
        const table = await this.table.get();
        await table.updateMany(updates);
    }

    public async create(row: Insert<T>) {
        const table = await this.table.get();
        return await table.create(row);
    }

    public async update(row: Update<T>) {
        const table = await this.table.get();
        return await table.update(row);
    }

    public async upsert(rows: Insert<T>[]) {
        await this.direct.upsert(<any[]>rows).throwOnError();
    }

    abstract toString(row: Row<T>): string;
    
    private async firstFreeId() {
        const sync = await this.table.get();
        const largestExisting = await sync.findLargestId();
        return (largestExisting ?? 0) + 1;
    }
}
