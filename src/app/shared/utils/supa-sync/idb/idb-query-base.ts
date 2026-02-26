import { Observable } from "rxjs";
import type { Subscription } from "../event-emitter";
import type { AnyCalculatedValues, Database, LocalRow, QueryResult, TableName } from "../supa-sync.types";
import type { IDBStoreAdapter } from "./idb-store-adapter";

export abstract class IDBQueryBase<
    D extends Database,
    T extends TableName<D>,
    C extends AnyCalculatedValues,
    R
> {
    protected abortSignal?: AbortSignal;

    constructor(
        protected readonly store: IDBStoreAdapter<LocalRow<D, T, C>>,
        private readonly resultMapping: (rows: LocalRow<D, T, C>[]) => R,
    ) {
    }

    protected abstract _getItems(): Promise<LocalRow<D, T, C>[]>;

    protected abstract _getKeys(): Promise<IDBValidKey[]>;

    protected abstract filterRow(row: LocalRow<D, T, C>): boolean;

    public abortOn(abortSignal: AbortSignal) {
        this.abortSignal = abortSignal;
        return this;
    }

    public async get(): Promise<R> {
        const items = await this._getItems();
        return this.resultMapping(items);
    }

    public async getKeys(): Promise<IDBValidKey[]> {
        return await this._getKeys();
    }

    public async count(): Promise<number> {
        const result = await this._getKeys();
        return result.length;
    }

    public subscribe(callback: (result: QueryResult<R>) => void): Subscription {
        return new Observable<QueryResult<R>>(subscriber => {
            this._getItems().then(items => {
                const result = this.resultMapping(items);
                subscriber.next({ result });
            });
            const sub = this.listenToChanges(res => subscriber.next(res));
            return () => sub.unsubscribe();
        }).subscribe(callback);
    }

    public listenToChanges(callback: (result: QueryResult<R>) => void) {
        return this.store.onChange.subscribe(changes => {
            const items: LocalRow<D, T, C>[] = [];
            const deletions: number[] = [];
            for (const change of changes) {
                const { old, new: cur } = change;
                if (cur && this.filterRow(cur))
                    items.push(cur);
                else if (old && (!cur || this.filterRow(old)))
                    deletions.push(old.id);
            }
            if (!items.length && !deletions.length) return;
            const result = items.length ? this.resultMapping(items) : undefined;
            callback({ result, deletions });
        });
    }
}