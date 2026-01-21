import { Observable } from "rxjs";
import { Subscription } from "../event-emitter";
import { Database, QueryResult, Row, TableName } from "../supa-sync.types";
import { IDBStoreAdapter } from "./idb-store-adapter";

export abstract class IDBQueryBase<D extends Database, T extends TableName<D>, R> {

    protected abortSignal?: AbortSignal;

    constructor(
        protected readonly store: IDBStoreAdapter<Row<D, T>>,
        private readonly resultMapping: (rows: Row<D, T>[]) => R,
    ) {
    }

    protected abstract _getItems(): Promise<Row<D, T>[]>;

    protected abstract _getKeys(): Promise<IDBValidKey[]>;

    protected abstract filterRow(row: Row<D, T>): boolean;

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
            const items: Row<D, T>[] = [];
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