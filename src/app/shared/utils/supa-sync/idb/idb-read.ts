import { IDBQueryBase } from "./idb-query-base";
import { IDBStoreAdapter } from "./idb-store-adapter";
import { Database, Row, TableName } from "../supa-sync.types";

export class IDBRead<D extends Database, T extends TableName<D>, R> extends IDBQueryBase<D, T, R> {
    
    constructor(
        store: IDBStoreAdapter<Row<D, T>>,
        private readonly ids: IDBValidKey[] | undefined,
        resultMapping: (rows: Row<D, T>[]) => R,
    ) {
        super(store, resultMapping);
    }

    protected async _getItems(): Promise<Row<D, T>[]> {
        let items = await (this.ids ? this.store.readMany(this.ids, this.abortSignal) : this.store.readAll(this.abortSignal));
        if (!items.length) {
            await this.store.initialized.get();
            items = await (this.ids ? this.store.readMany(this.ids, this.abortSignal) : this.store.readAll(this.abortSignal));
        }
        return items;
    }

    protected async _getKeys(): Promise<IDBValidKey[]> {
        if (this.ids) return this.ids;
        return await this.store.readAllKeys(this.abortSignal);
    }

    protected filterRow(update: Row<D, T>): boolean {
        return this.ids?.includes(update.id) ?? true;
    }
}
