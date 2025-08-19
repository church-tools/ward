import type { Change, Column, Database, Row, TableName } from "../supa-sync.types";
import { IDBQueryBase } from "./idb-query-base";
import { IDBStoreAdapter } from "./idb-store-adapter";

type ConditionValue<T, C extends keyof T> = T[C] & IDBValidKey;
type FieldCondition<T> = { field: keyof T & string };
type EqCondition<T, C extends keyof T> = FieldCondition<T> & { operator: "eq"; value: ConditionValue<T, C> };
type GtCondition<T, C extends keyof T> = FieldCondition<T> & { operator: "gt"; value: ConditionValue<T, C> };
type InCondition<T, C extends keyof T> = FieldCondition<T> & { operator: "in"; value: ConditionValue<T, C>[] };
type Condition<T, C extends keyof T> = EqCondition<T, C> | InCondition<T, C> | GtCondition<T, C>;

export class IDBFilterBuilder<D extends Database, T extends TableName<D>, R> extends IDBQueryBase<D, T, R> {
    
    constructor(
        store: IDBStoreAdapter<Row<D, T>>,
        resultMapping: (rows: Row<D, T>[]) => R,
    ) {
        super(store, resultMapping);
    }

    private readonly conditions: Condition<Row<D, T>, Column<D, T>>[] = [];

    public eq<K extends Column<D, T>>(field: K, value: Row<D, T>[K]): this {
        this.conditions.push({ field, operator: "eq", value });
        return this;
    }

    public in<K extends Column<D, T>>(field: K, values: Row<D, T>[K][]): this {
        this.conditions.push({ field, operator: "in", value: values });
        return this;
    }

    protected async _getItems(): Promise<Row<D, T>[]> {
        return await this.getResults<Row<D, T>>();
    }

    protected async _getKeys(): Promise<IDBValidKey[]> {
        return this.getResults<IDBValidKey>(true);
    }

    private async getResults<R extends Row<D, T> | IDBValidKey>(keysOnly?: R extends IDBValidKey ? true : undefined): Promise<R[]> {
        if (this.conditions.length === 1) {
            const index = await this.store.getIndex(this.conditions[0].field);
            return await this.queryCondition(this.conditions[0], keysOnly ? index.getAllKeys : index.getAll) as R[];
        } else {
            let keys: Set<IDBValidKey>;
            await Promise.all(this.conditions.map(async condition => {
                const index = await this.store.getIndex(condition.field);
                const result = await this.queryCondition(condition, index.getAllKeys) as IDBValidKey[];
                keys = keys?.intersection(new Set(result)) ?? new Set(result);
            }));
            const keyArray = Array.from(keys!);
            if (keysOnly) return keyArray as R[];
            return await this.store.readMany(keyArray, this.abortSignal) as R[];
        }
    }

    protected filterRow(row: Row<D, T>): boolean {
        return this.conditions.every(condition => {
            const value = row[condition.field];
            switch (condition.operator) {
                case 'eq': return value === condition.value;
                case 'in': return condition.value.includes(value);
                case 'gt': return value > condition.value;
            }
        });
    }
    
    private async queryCondition(condition: Condition<T, keyof T>, fetchFn: (value: IDBValidKey | IDBKeyRange) => IDBRequest) {
        const requests = (function getRequests() {
            switch (condition.operator) {
                case 'eq': return [fetchFn(condition.value)];
                case 'in': return condition.value.map(val => fetchFn(val));
                case 'gt': return [fetchFn(IDBKeyRange.lowerBound(condition.value))];
            }
        })();
        return await Promise.all(requests.map(req => new Promise((resolve, reject) => {
            req.addEventListener('success', () => resolve(req.result));
            req.addEventListener('error', () => reject(req.error));
        })));
    }

}