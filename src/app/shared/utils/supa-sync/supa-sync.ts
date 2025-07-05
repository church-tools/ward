import { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import { AsyncState } from "../async-state";
import { IDBStoreAdapter } from "./table/idb-store-adapter";
import { Row, SupaSyncTable } from "./table/supa-sync-table";

const META_DATA_KEY = "__meta_data__";

export type Database = { public: { Tables: { [key: string]: any } } };
export type TableName<D extends Database> = keyof D["public"]["Tables"] & string;

export type IDBInfo<D extends Database> = {
    name: string;
    version: number;
    tableNames: TableName<D>[]
}

function getPendingStoreName(tableName: TableName<Database>) {
    return 'pending_' + tableName;
}

export class SupaSync<D extends Database> {

    private channel: RealtimeChannel | undefined;

    private readonly tablesByName: Record<TableName<D>, SupaSyncTable<D, TableName<D>>> = <any>{};
    private readonly adaptersByStoreName: Record<string, IDBStoreAdapter<Row<D, TableName<D>>>> = <any>{};

    constructor(
        private readonly supabase: SupabaseClient<D>,
        private readonly isOnline: AsyncState<boolean>,
        idbInfo: IDBInfo<D>
    ) {
        IDBStoreAdapter.setup(idbInfo.name, idbInfo.version, idbInfo.tableNames);
        for (const tableName of idbInfo.tableNames) {
            const pendingStoreName = getPendingStoreName(tableName);
            this.adaptersByStoreName[tableName] = new IDBStoreAdapter<Row<D, TableName<D>>>(tableName);
            this.adaptersByStoreName[pendingStoreName] = new IDBStoreAdapter<Row<D, TableName<D>>>(pendingStoreName);
        }
        isOnline.get()
        .then(() => this.startSyncing(idbInfo.tableNames));
    }

    public getTable<T extends TableName<D>>(tableName: T, createOffline: boolean, updateOffline: boolean) {
        const tableAdapter = this.adaptersByStoreName[tableName];
        const pendingStoreAdapter = this.adaptersByStoreName[getPendingStoreName(tableName)];
        const table = new SupaSyncTable<D, T>(this.supabase, this.isOnline, tableAdapter, pendingStoreAdapter, tableName, createOffline, updateOffline);
        this.tablesByName[tableName] = table;
        return table;
    }

    public cleanup() {
        if (this.channel) {
            this.supabase.removeChannel(this.channel);
            this.channel = undefined;
        }
    }

    private async startSyncing(tableNames: TableName<D>[]) {
        await Promise.all(tableNames.map(async tableName => {
            const lastUpdatedAt = await this.getLastSync(tableName);
            const now = Date.now();
            const { data } = await this.supabase.from(tableName)
                .select('*')
                .gt('updated_at', lastUpdatedAt)
                .throwOnError();
            const adapter = this.adaptersByStoreName[tableName];
            await adapter.writeMany(data);
            await this.updateLastSync(tableName, now);
        }));
        this.channel = this.supabase.channel(`schema-db-changes`)
        .on('postgres_changes',
            { event: '*', schema: 'public' },
            (payload: { table: TableName<D>, eventType: 'INSERT' | 'UPDATE' | 'DELETE', new: Row<D, TableName<D>> }) => {
                const adapter = this.adaptersByStoreName[payload.table];
                switch (payload.eventType) {
                    case 'INSERT': case 'UPDATE':
                        adapter.write(payload.new);
                        break;
                    case 'DELETE':
                        // table.writeFromServer([payload.new]);
                        break;
                }
            })
        .subscribe((status: string) => {
            switch (status) {
                case 'CHANNEL_ERROR':
                    console.error('Failed to subscribe to realtime channel');
                    break;
                case 'TIMED_OUT':
                    console.error('Realtime subscription timed out');
                    break;
            }
        });
    }

    private async getLastSync(tableName: TableName<D>) {
        const adapter = this.adaptersByStoreName[tableName];
        const metaData = await adapter.read<{ lastSync: number }>(META_DATA_KEY);
        return new Date(metaData?.lastSync ?? 0).toISOString();
    }

    private async updateLastSync(tableName: TableName<D>, lastSync: number) {
        const adapter = this.adaptersByStoreName[tableName];
        await adapter.write({ id: META_DATA_KEY, lastSync });
    }
}