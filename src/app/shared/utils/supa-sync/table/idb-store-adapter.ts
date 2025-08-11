import { EventEmitter } from "@angular/core";
import { AsyncState } from "../../async-state";
import { Database, SupaSyncQuery, SupaSyncQueryValue, TableName } from "../supa-sync";

export type IDBStoreInfo = {
    name: string;
    keyPath: string;
    indexes?: { key: any; unique?: boolean }[];
    autoIncrement?: boolean;
}

export class IDBStoreAdapter<T> {

    public static async setup(name: string, version: number, storeInfos: IDBStoreInfo[]) {
        return new Promise<IDBDatabase>((resolve, reject) => {
            const openRequest = indexedDB.open(name, version);
            openRequest.onupgradeneeded = (event) => {
                const idb = (event.target as IDBOpenDBRequest).result;
                for (const { name, keyPath, indexes, autoIncrement } of storeInfos) {
                    const store = idb.objectStoreNames.contains(name)
                        ? (event.target as IDBOpenDBRequest).transaction!.objectStore(name)
                        : idb.createObjectStore(name, { keyPath, autoIncrement });
                    for (const { key, unique } of indexes ?? [])
                        if (!store.indexNames.contains(key))
                            store.createIndex(key, key, { unique: unique ?? false });
                }
                resolve(idb);
            };
            openRequest.onsuccess = (event) => {
                resolve((event.target as IDBOpenDBRequest).result);
            };
            openRequest.onerror = (event) => {
                reject((event.target as IDBOpenDBRequest).error);
            };
            openRequest.onblocked = () => {
                reject(new Error("IndexedDB is blocked. Please close other tabs using this database."));
            };

        })
    }

    readonly onWrite = new EventEmitter<T>();
    readonly initialized = new AsyncState<boolean>();

    constructor(
        private readonly idb: IDBDatabase,
        private readonly storeName: string,
    ) {}
    
    public write(item: T) {
        return new Promise<void>((resolve, reject) => {
            const transaction = this.idb.transaction(this.storeName, "readwrite");
            const store = transaction.objectStore(this.storeName);
            store.put(item);
            transaction.oncomplete = () => resolve();
            transaction.onerror = err => reject(err);
        });
    }

    public writeMany(items: T[]) {
        if (items.length === 0) return Promise.resolve();
        return new Promise<void>((resolve, reject) => {
            const transaction = this.idb.transaction(this.storeName, "readwrite");
            const store = transaction.objectStore(this.storeName);
            for (const row of items) store.put(row);
            transaction.oncomplete = () => resolve();
            transaction.onerror = err => reject(err);
        });
    }

    public read<I = T>(key: number | string) {
        return new Promise<I | undefined>((resolve, reject) => {
            const transaction = this.idb.transaction(this.storeName, "readonly");
            const store = transaction.objectStore(this.storeName);
            const req = store.get(key);
            req.onsuccess = () => resolve(req.result);
            req.onerror = err => reject(err);
        });
    }

    public readMany(keys: number[]) {
        if (keys.length === 0) return Promise.resolve([]);
        return new Promise<(T | undefined)[]>((resolve, reject) => {
            const transaction = this.idb.transaction(this.storeName, "readonly");
            const store = transaction.objectStore(this.storeName);
            const results = new Array<T | undefined>(keys.length);
            for (let i = 0; i < keys.length; i++) {
                const key = keys[i];
                const req = store.get(key);
                req.onsuccess = () => {
                    if (req.result) results[i] = req.result;
                };
                req.onerror = err => reject(err);
            }
            transaction.oncomplete = () => resolve(results);
        });
    }

    public readAll() {
        return new Promise<T[]>((resolve, reject) => {
            const transaction = this.idb.transaction(this.storeName, "readonly");
            const store = transaction.objectStore(this.storeName);
            const req = store.getAll();
            req.onsuccess = () => resolve(req.result);
            req.onerror = err => reject(err);
        });
    }

    public findLargestId() {
        return new Promise<number | undefined>((resolve, reject) => {
            const transaction = this.idb.transaction(this.storeName, "readonly");
            const store = transaction.objectStore(this.storeName);
            const index = store.index('id');
            const req = index.openKeyCursor(null, 'prev');
            req.onsuccess = () => {
                const cursor = req.result;
                if (cursor) {
                    resolve(cursor.key as number);
                } else {
                    resolve(undefined);
                }
            };
            req.onerror = err => reject(err);
        });
    }

    public delete(key: number | string) {
        return new Promise<void>((resolve, reject) => {
            const transaction = this.idb.transaction(this.storeName, "readwrite");
            const store = transaction.objectStore(this.storeName);
            store.delete(key);
            transaction.oncomplete = () => resolve();
            transaction.onerror = err => reject(err);
        });
    }

    public deleteMany(keys: number[]) {
        if (keys.length === 0) return Promise.resolve();
        return new Promise<void>((resolve, reject) => {
            const transaction = this.idb.transaction(this.storeName, "readwrite");
            const store = transaction.objectStore(this.storeName);
            for (const key of keys) store.delete(key);
            transaction.oncomplete = () => resolve();
            transaction.onerror = err => reject(err);
        });
    }

    public clear() {
        return new Promise<void>((resolve, reject) => {
            const transaction = this.idb.transaction(this.storeName, "readwrite");
            const store = transaction.objectStore(this.storeName);
            store.clear();
            transaction.oncomplete = () => resolve();
            transaction.onerror = err => reject(err);
        });
    }

    public lock(safeFunc: () => Promise<void>, timeout = 5000) {
        return navigator.locks.request(this.storeName, async () => Promise.race([
            safeFunc(),
            new Promise<void>((_, reject) => setTimeout(
                () => reject(new Error(`Lock timeout for ${this.storeName}`)),
                timeout
            )),
        ]));
    }

    public getIndex(indexName: string) {
        const transaction = this.idb.transaction(this.storeName, "readonly");
        const store = transaction.objectStore(this.storeName);
        if (!store.indexNames.contains(indexName))
            throw new Error(`"${this.storeName}" store doesn't have an index for "${indexName}"`);
        return store.index(indexName) as IDBIndex<T>;
    }
}

declare global {
    interface IDBIndex<V = any> {
        query<D extends Database, T extends TableName<D>, K extends keyof SupaSyncQuery<D, T>>(
            attributeQuery: SupaSyncQuery<D, T>[K]): Promise<V[]>;
    }
}

IDBIndex.prototype.query = async function<D extends Database, T extends TableName<D>, K extends keyof SupaSyncQuery<D, T>>(
    attributeQuery: SupaSyncQuery<D, T>[K]): Promise<T[]>
{
    const queryValue = attributeQuery as SupaSyncQueryValue<D, T, K>;
    if (typeof queryValue === 'object') {
        if ('in' in queryValue) {
            const requests = queryValue.in.map(value => this.getAll(value));
            const results2d = await Promise.all(requests.map(req => getResult(req)))
            return results2d.flat() as T[];
        } else if ('not' in queryValue) {
            const not = queryValue.not;
            return [];
        }
    }
    return await getResult(this.getAll(queryValue));
}

function getResult<T = any>(req: IDBRequest): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        req.addEventListener('success', () => resolve(req.result), { once: true });
        req.addEventListener('error', () => reject(req.error), { once: true });
    });
}
