import { Observable } from "rxjs";
import { IDBStoreAdapter } from "./idb-store-adapter";
import type { Column, Database, Row, TableName } from "./supa-sync.types";

type FieldCondition<T> = { field: keyof T };
type EqCondition<T, K extends keyof T> = FieldCondition<T> & { operator: "eq"; value: T[K] };
type InCondition<T, K extends keyof T> = FieldCondition<T> & { operator: "in"; value: T[K][] };

type Condition<T> = EqCondition<T, keyof T> | InCondition<T, keyof T>;

export class IDBFilterBuilder<D extends Database, T extends TableName<D>, R> {
    
    constructor(
        private readonly store: IDBStoreAdapter<Row<D, T>>,
        private readonly callback: (rows: Row<D, T>[]) => R
    ) {}

    private readonly conditions: Condition<Row<D, T>>[] = [];

    public eq<K extends Column<D, T>>(field: K, value: Row<D, T>[K]): this {
        this.conditions.push({ field, operator: "eq", value });
        return this;
    }

    public in<K extends Column<D, T>>(field: K, values: Row<D, T>[K][]): this {
        this.conditions.push({ field, operator: "in", value: values });
        return this;
    }

    public async exec(): Promise<R> {
        return <any>null;
    }

    public observe(): Observable<R> {
        return new Observable<R>(subscriber => {
            
        });
    }

    // private queryResults<D extends Database, T extends TableName<D>, K extends keyof PureSupaSyncQuery<D, T>>(
    //     queryValue: PureSupaSyncQuery<D, T>[K])
    // {    
    //     if (typeof queryValue === 'object') {
    //         if ('in' in queryValue) {
    //             queryValue.in.map(value => this.getAll(value)).flat()

    //         } else if ('not' in queryValue) {
    //             const not = queryValue.not;
    //             return [];
    //         }
    //     }
    //     return await getResult(this.getAll(queryValue));
    // }
}

// declare global {
//     interface IDBIndex<V = any> {
//         query<D extends Database, T extends TableName<D>, K extends keyof PureSupaSyncQuery<D, T>>(
//             attributeQuery: SupaSyncQueryValue<D, T, K>): Promise<V[]>;
//         queryIds<D extends Database, T extends TableName<D>, K extends keyof PureSupaSyncQuery<D, T>>(
//             attributeQuery: SupaSyncQueryValue<D, T, K>): Promise<number[]>;
//     }
// }

// IDBIndex.prototype.query = async function<D extends Database, T extends TableName<D>, K extends keyof PureSupaSyncQuery<D, T>>(
//     attributeQuery: SupaSyncQueryValue<D, T, K>): Promise<T[]>
// {
//     if (typeof attributeQuery === 'object') {
//         if ('in' in attributeQuery) {
//             const requests = attributeQuery.in.map(value => this.getAll(value));
//             const results2d = await Promise.all(requests.map(req => getResult(req)))
//             return results2d.flat() as T[];
//         } else if ('not' in attributeQuery) {
//             const not = attributeQuery.not;
//             return [];
//         }
//     }
//     return await getResult(this.getAll(attributeQuery));
// }

// IDBIndex.prototype.queryIds = async function<D extends Database, T extends TableName<D>, K extends keyof PureSupaSyncQuery<D, T>>(
//     attributeQuery: PureSupaSyncQuery<D, T>[K]): Promise<number[]>
// {
//     const queryValue = attributeQuery as SupaSyncQueryValue<D, T, K>;
//     if (typeof queryValue === 'object') {
//         if ('in' in queryValue) {
//             const requests = queryValue.in.map(value => this.getAll(value));
//             const results2d = await Promise.all(requests.map(req => getResult(req)))
//             return results2d.flat() as T[];
//         } else if ('not' in queryValue) {
//             const not = queryValue.not;
//             return [];
//         }
//     }
//     return await getResult(this.getAll(queryValue));
// }

// function getResult<T = any>(req: IDBRequest): Promise<T> {
//     return new Promise<T>((resolve, reject) => {
//         req.addEventListener('success', () => resolve(req.result), { once: true });
//         req.addEventListener('error', () => reject(req.error), { once: true });
//     });
// }
