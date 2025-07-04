import { inject, Injectable, Injector, signal } from "@angular/core";
import { User } from "@supabase/supabase-js";
import { Observable } from "rxjs";
import { Database } from "../../../../database";
import { environment } from "../../../environments/environment";
import { SupabaseService } from "../../shared/supabase.service";
import { Insert, KeyWithValue, Row, TableName } from "../../shared/types";
import { AsyncValue } from "../../shared/utils/async-value";
import { filterRecords, findInRecords, findRecord } from "../../shared/utils/record-utils";
import { SupaLegend } from "../../shared/utils/supa-legend";

export type RowRecords<T extends TableName> = Record<number, Row<T>>;

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

    protected readonly supaLegend = new AsyncValue<SupaLegend<Database, T>>();

    readonly idKey = 'id' as KeyWithValue<Row<T>, number>;
    abstract readonly tableName: T;
    abstract readonly orderField: KeyWithValue<Row<T>, number> | null;
    abstract readonly createOffline: boolean;

    public get direct() { return this.supabase.client.from(this.tableName); }

    constructor() {
        this.supabase.getSession()
        .then(session => this.setup(session?.user));
    }

    public async get(id: number): Promise<Row<T> | undefined> {
        const supaLegend = await this.supaLegend.get();
        const row = supaLegend.get()?.[id];
        if (row) return row;
        await supaLegend.loaded;
        return supaLegend.get()?.[id];
    }

    public async getAllById(): Promise<Record<number, Row<T>>> {
        const supaLegend = await this.supaLegend.get();
        return supaLegend.get() ?? new Map<number, Row<T>>();
    }

    public async find(filter: (row: Row<T>) => boolean): Promise<Row<T> | undefined> {
        const supaLegend = await this.supaLegend.get();
        const rowsById = supaLegend.get();
        if (!rowsById) return undefined;
        const rows = Object.values(rowsById) as Row<T>[];
        return rows.find(filter);
    }

    public syncAll() {
        return new Observable<Record<number, Row<T>>> (subscriber => {
            let unsubscribe: (() => void) | undefined;
            this.supaLegend.get()
            .then(supaLegend => {
                const initialData = supaLegend.get();
                if (initialData) subscriber.next(initialData);
                unsubscribe = supaLegend.onChange(params => {
                    // todo handle changes
                    const data = supaLegend.get();
                    subscriber.next(data);
                });
            });
            return () => unsubscribe?.();
        });
    }

    public observe(filter: (row: Row<T>) => boolean): Observable<Row<T> | undefined> {
        return new Observable<Row<T> | undefined>(subscriber => {
            let unsubscribe: (() => void) | undefined;
            this.supaLegend.get()
            .then(supaLegend => {
                const rowRecords = supaLegend.get();
                const row = findInRecords(rowRecords, filter);
                subscriber.next(row);
                unsubscribe = supaLegend.onChange(params => {
                    if (!params.value) return;
                    const row = findInRecords(params.value, filter);
                    if (!row) return;
                    subscriber.next(row);
                });
            });
            return () => unsubscribe?.();
        });
    }

    public observeMany(filter?: (row: Row<T>) => boolean): Observable<RowRecords<T>> {
        return new Observable<RowRecords<T>>(subscriber => {
            let unsubscribe: (() => void) | undefined;
            this.supaLegend.get()
            .then(supaLegend => {
                let records = supaLegend.get() as RowRecords<T>;
                if (filter) records = filterRecords(records, filter);
                subscriber.next(records);
                unsubscribe = supaLegend.onChange(() => {
                    let records = supaLegend.get() as RowRecords<T>;
                    if (filter) records = filterRecords(records, filter);
                    subscriber.next(records);
                });
            });
            return () => unsubscribe?.();
        });
    }

    public manyAsSignal(filter?: (row: Row<T>, user: User) => boolean) {
        const sig = signal<RowRecords<T>>([]);
        this.supaLegend.get()
        .then(supaLegend => {
            let records = supaLegend.get() as RowRecords<T>;
            const f = filter ? (row: Row<T>) => filter(row, supaLegend.user) : undefined;
            if (f) records = filterRecords(records, f);
            sig.set(records);
            supaLegend.onChange(() => {
                let records = supaLegend.get() as RowRecords<T>;
                if (f) records = filterRecords(records, f);
                sig.set(records);
            });
        });
        return sig;
    }

    public asSignal(filter: (row: Row<T>, user: User) => boolean) {
        const sig = signal<Row<T> | undefined>(undefined);
        this.supaLegend.get()
        .then(supaLegend => {
            const f = (row: Row<T>) => filter(row, supaLegend.user);
            sig.set(findRecord(supaLegend.get(), f));
            supaLegend.onChange(() => {
                sig.set(findRecord(supaLegend.get(), f));
            });
        });
        return sig;
    }

    public async insertRow(row: Insert<T>): Promise<Row<T>> {
        const supaLegend = await this.supaLegend.get();
        return supaLegend.insertRow(row);
    }

    public async updateRows(rows: Row<T>[], ...updateFields: (keyof Row<T>)[]) {
        const supaLegend = await this.supaLegend.get();
        for (const row of rows)
            supaLegend.updateRow(row as any, updateFields);
    }

    public async create(row: Insert<T>) {
        if (this.createOffline) {
            const supaLegend = await this.supaLegend.get();
            supaLegend.insertRow(row);
        } else {
            const id = await this.firstFreeId();
            await this.direct.insert({ ...row, id } as any).throwOnError();
        }
    }

    public async upsert(rows: Insert<T>[]) {
        await this.direct.upsert(<any[]>rows).throwOnError();
    }

    abstract toString(row: Row<T>): string;
    
    private async setup(user: User | undefined) {
        if (!user) throw 'User not authenticated, syncing will not work';
        const supaLegend = new SupaLegend(this.supabase.client, this.tableName, user, {
            databaseName: `${environment.appId}-${user.id}`,
            version: 1,
            tableNames: ['agenda', 'task', 'profile'],
        });
        await supaLegend.persistLoaded;
        this.supaLegend.set(supaLegend);
    }
    

    private async firstFreeId(first = 1) {
        const existingRows = await this.getAllById();
        let index = first;
        while (index in existingRows) index++;
        return index;
    }
}
