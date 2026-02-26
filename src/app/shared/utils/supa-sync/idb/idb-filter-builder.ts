import type { AnyCalculatedValues, Column, Database, Indexed, RemoteRow, LocalRow, TableName } from "../supa-sync.types";
import { IDBQueryBase } from "./idb-query-base";
import type { IDBSearchIndex } from "./idb-search-index";
import { idbBoolToNumber, IDBStoreAdapter } from "./idb-store-adapter";

type ConditionValue<T, C extends keyof T> = T[C] & IDBValidKey;
type FieldCondition<T> = { field: keyof T & string };
type EqCondition<T, C extends keyof T> = FieldCondition<T> & { operator: "eq"; value: ConditionValue<T, C> };
type ContainsCondition<T, C extends keyof T> = FieldCondition<T> & { operator: "contains"; value: ConditionValue<T, C> };
type ContainsAnyCondition<T, C extends keyof T> = FieldCondition<T> & { operator: "containsAny"; value: ConditionValue<T, C>[] };
type ContainsTextCondition = { operator: "containsText"; value: string; };
type StartsWithCondition = { operator: "startsWith"; value: string; };
type ClosestCondition = { operator: "closest"; value: string; limit: number; };
type GtCondition<T, C extends keyof T> = FieldCondition<T> & { operator: "gt"; value: ConditionValue<T, C> };
type LtCondition<T, C extends keyof T> = FieldCondition<T> & { operator: "lt"; value: ConditionValue<T, C> };
type NotCondition<T, C extends keyof T> = FieldCondition<T> & { operator: "not"; value: ConditionValue<T, C> };
type InCondition<T, C extends keyof T> = FieldCondition<T> & { operator: "in"; value: ConditionValue<T, C>[] };
type Condition<T, C extends keyof T> = EqCondition<T, C> | NotCondition<T, C> | InCondition<T, C>
    | GtCondition<T, C> | LtCondition<T, C> | ContainsCondition<T, C> | ContainsAnyCondition<T, C>;
export type SearchCondition = ContainsTextCondition | StartsWithCondition | ClosestCondition;
type FieldOrSearchCondition<T> = Condition<T, keyof T> | SearchCondition;

export class IDBFilterBuilder<D extends Database, T extends TableName<D>, C extends AnyCalculatedValues, R> extends IDBQueryBase<D, T, C, R> {
    
    constructor(
        store: IDBStoreAdapter<LocalRow<D, T, C>>,
        private readonly searchIndex: IDBSearchIndex | undefined,
        resultMapping: (rows: LocalRow<D, T, C>[]) => R,
        private readonly indexed: Indexed<D, T>,
    ) {
        super(store, resultMapping);
    }

    private readonly conditions: FieldOrSearchCondition<RemoteRow<D, T>>[] = [];

    public eq<K extends Column<D, T>>(field: K, value: RemoteRow<D, T>[K]): this {
        this.conditions.push({ field, operator: "eq", value });
        return this;
    }
    
    public not<K extends Column<D, T>>(field: K, value: RemoteRow<D, T>[K]): this {
        this.conditions.push({ field, operator: "not", value });
        return this;
    }

    public in<K extends Column<D, T>>(field: K, values: RemoteRow<D, T>[K][]): this {
        this.conditions.push({ field, operator: "in", value: values });
        return this;
    }

    public contains<K extends Column<D, T>>(field: K, value: RemoteRow<D, T>[K][number]): this {
        this.conditions.push({ field, operator: "contains", value });
        return this;
    }

    public containsAny<K extends Column<D, T>>(field: K, values: RemoteRow<D, T>[K]): this {
        this.conditions.push({ field, operator: "containsAny", value: values });
        return this;
    }

    public startsWith(value: string): this {
        this.conditions.push({ operator: "startsWith", value: value.toLowerCase() });
        return this;
    }

    public containsText(value: string): this {
        this.conditions.push({ operator: "containsText", value: value.toLowerCase() });
        return this;
    }

    public closestText(value: string, limit: number): this {
        this.conditions.push({ operator: "closest", value: value.toLowerCase(), limit });
        return this;
    }

    protected async _getItems(): Promise<LocalRow<D, T, C>[]> {
        return await this.getResults<LocalRow<D, T, C>>();
    }

    protected async _getKeys(): Promise<IDBValidKey[]> {
        return this.getResults<IDBValidKey>(true);
    }

    private async getResults<R extends RemoteRow<D, T> | IDBValidKey>(keysOnly?: R extends IDBValidKey ? true : undefined): Promise<R[]> {
        if (this.conditions.length === 1) {
            const condition = this.conditions[0];
            if ('field' in condition) {
                const index = await this.store.getIndex(condition.field);
                return await this.queryCondition<R>(condition, keysOnly
                    ? index.getAllKeys.bind(index)
                    : index.getAll.bind(index));
            } else {
                if (!this.searchIndex) throw new Error(`no search defined for table ${this.store.storeName}`);
                const keys = [...await this.searchIndex.queryCondition(condition)];
                return keysOnly ? keys as R[] : await this.store.readMany(keys, this.abortSignal) as R[];
            }
        }
        let keys: Set<IDBValidKey>;
        await Promise.all(this.conditions.map(async condition => {   
            if ('field' in condition) {
                const index = await this.store.getIndex(condition.field);
                const result = await this.queryCondition<IDBValidKey>(condition, index.getAllKeys.bind(index));
                keys = keys?.intersection(new Set(result)) ?? new Set(result);
            } else {
                if (!this.searchIndex) throw new Error(`no search defined for table ${this.store.storeName}`);
                const result = await this.searchIndex.queryCondition(condition);
                keys = keys?.intersection(result) ?? result;
            }
        }));
        const keyArray = Array.from(keys!);
        if (keysOnly) return keyArray as R[];
        return await this.store.readMany(keyArray, this.abortSignal) as R[];
    }

    protected filterRow(row: LocalRow<D, T, C>): boolean {
        return this.conditions.every(condition => {
            if (!('field' in condition)) return true;
            const value = row[condition.field];
            switch (condition.operator) {
                case 'eq':
                    if (this.indexed[condition.field] && this.indexed[condition.field] === Boolean)
                        return value === idbBoolToNumber(condition.value);
                    return value === condition.value;
                case 'contains':
                    if (!value) return false;
                    return (value as any[]).includes(condition.value);
                case 'containsAny': {
                    if (!value) return false;
                    return (value as any[]).some(v => condition.value.includes(v));
                }
                case 'in': return condition.value.includes(value);
                case 'gt': return value > condition.value;
                case 'lt': return value < condition.value;
                case 'not': {
                    if (this.indexed[condition.field] && this.indexed[condition.field] === Boolean)
                        return !(value === idbBoolToNumber(condition.value));
                    return !(value === condition.value);
                }
            }
        });
    }

    private queryCondition<R>(condition: Condition<T, keyof T>, fetchFn: (value: IDBValidKey | IDBKeyRange) => IDBRequest) {
        const requests = [(() => {
            const { operator, value } = condition;
            switch (operator) {
                case 'eq':
                case 'contains': {
                    const val = this.indexed[condition.field] === Boolean
                        ? idbBoolToNumber(value as boolean | null) : value;
                    return fetchFn(val);
                }
                case 'containsAny': {
                    const vals = (value as any[]).map(val => this.indexed[condition.field] === Boolean
                        ? idbBoolToNumber(val as boolean | null) : val);
                    return vals.map(val => fetchFn(val));
                }
                case 'in': return value.map(val => fetchFn(val));
                case 'gt': return fetchFn(IDBKeyRange.lowerBound(value));
                case 'lt': return fetchFn(IDBKeyRange.upperBound(value));
                case 'not':  {
                    const val = this.indexed[condition.field] === Boolean
                        ? idbBoolToNumber(value as boolean | null) : value;
                    return [
                        fetchFn(IDBKeyRange.lowerBound(val, true)),
                        fetchFn(IDBKeyRange.upperBound(val, true)),
                    ];
                }
            }
        })()].flat();
        return Promise.all(requests.map(req => req.toPromise<R[]>())).then(results => results.flat());
    };
}

