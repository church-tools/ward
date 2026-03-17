import type { AnyCalculatedValues, Database, LocalRow, TableName } from "../supa-sync.types";
import { IDBQueryBase } from "./idb-query-base";
import type { IDBStoreAdapter } from "./idb-store-adapter";

export class IDBRead<D extends Database, T extends TableName<D>, C extends AnyCalculatedValues, R> extends IDBQueryBase<D, T, C, R> {
    
    private skipDataSyncWait: boolean | undefined;

    constructor(
        store: IDBStoreAdapter<LocalRow<D, T, C>, 'id'>,
        private readonly dataSynced: Promise<void>,
        private readonly ids: IDBValidKey[] | undefined,
        resultMapping: (rows: LocalRow<D, T, C>[]) => R,
    ) {
        super(store, resultMapping);
    }

    public dontWaitForDataSync() {
        this.skipDataSyncWait = true;
        return this;
    }

    protected async _getItems(): Promise<LocalRow<D, T, C>[]> {
        let items = await (this.ids
            ? this.store.readMany(this.ids, this.abortSignal)
            : this.store.readAll(this.abortSignal));
        if (!items.length && !this.skipDataSyncWait) {
            await this.dataSynced;
            items = await (this.ids
                ? this.store.readMany(this.ids, this.abortSignal)
                : this.store.readAll(this.abortSignal));
        }
        return items;
    }

    protected async _getKeys(): Promise<IDBValidKey[]> {
        if (this.ids) return this.ids;
        return await this.store.readAllKeys(this.abortSignal);
    }

    protected filterRow(update: LocalRow<D, T, C>): boolean {
        return this.ids?.includes(update.id) ?? true;
    }
}
