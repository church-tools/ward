import { inject, Injectable, Injector, signal } from "@angular/core";
import { User } from "@supabase/supabase-js";
import { Observable } from "rxjs";
import { Database } from "../../../../database";
import { environment } from "../../../environments/environment";
import { SupabaseService } from "../../shared/supabase.service";
import { IdOf, Insert, KeyWithValue, Row, TableName } from "../../shared/types";
import { AsyncValue } from "../../shared/utils/async-value";
import { SupaLegend } from "../../shared/utils/supa-legend";

export async function getTableService<T extends TableName>(injector: Injector, tableName: T) {
    const service = await (async () => {
        switch (tableName) {
            case 'agenda': return (await import('../agenda/agenda.service')).AgendaService;
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

    abstract readonly tableName: T;
    abstract readonly idField: KeyWithValue<Row<T>, string | number>;
    abstract readonly orderField?: KeyWithValue<Row<T>, number> | null;
    abstract readonly uuidField?: KeyWithValue<Row<T>, string> | null;

    public get direct() { return this.supabase.client.from(this.tableName); }

    constructor() {
        this.supabase.getSession()
        .then(session => this.setup(session?.user));
    }

    public async getAllById(): Promise<Record<number, Row<T>>> {
        const supaLegend = await this.supaLegend.get();
        return supaLegend.get() || {};
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

    public observe(filter?: (row: Row<T>) => boolean): Observable<Row<T>[]> {
        return new Observable<Row<T>[]>(subscriber => {
            this.supaLegend.get()
            .then(supaLegend => {
                const rows = this.getRows(supaLegend.get(), filter);
                subscriber.next(rows);
                const unsubscribe = supaLegend.onChange(() => {
                    const rows = this.getRows(supaLegend.get(), filter);
                    subscriber.next(rows);
                });
                return () => unsubscribe();
            });
        });
    }

    public asSignal(filter?: (row: Row<T>) => boolean) {
        const sig = signal<Row<T>[]>([]);
        this.supaLegend.get()
        .then(supaLegend => {
            const rows = this.getRows(supaLegend.get(), filter);
            sig.set(rows);
            supaLegend.onChange(() => {
                const rows = this.getRows(supaLegend.get(), filter);
                sig.set(rows);
            });
        });
        return sig;
    }

    public async updateRows(rows: (Row<T>)[]) {
        const supaLegend = await this.supaLegend.get();
        for (const row of rows) {
            const obs = supaLegend.getRow(row[this.idField] as IdOf<T>).assign(row);
        }
    }

    public async upsert(rows: Insert<T>[]) {
        await this.direct.upsert(<any[]>rows).throwOnError();
    }

    private getRows(rowRecords: Record<number, Row<T>> | undefined, filter?: (row: Row<T>) => boolean): Row<T>[] {
        let rows = Object.values(rowRecords || {}) as Row<T>[];
        if (filter) rows = rows.filter(filter);
        const orderField = this.orderField;
        if (!orderField) return rows;
        return rows.sort((a, b) => <number>a[orderField] - <number>b[orderField]);
    }

    abstract toString(row: Row<T>): string;
    
    private setup(user: User | undefined) {
        if (!user) throw 'User not authenticated, syncing will not work';
        this.supaLegend.set(new SupaLegend(this.supabase.client, this.tableName, {
            databaseName: `${environment.appId}-${user.id}`,
            version: 1,
            tableNames: ['agenda', 'profile'],
        }));
    }
}
