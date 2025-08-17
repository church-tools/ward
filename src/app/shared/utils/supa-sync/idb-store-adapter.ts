import { EventEmitter } from "@angular/core";
import { AsyncState } from "../async-state";

export class IDBStoreAdapter<T> {

    readonly onWrite = new EventEmitter<T>();
    readonly initialized = new AsyncState<boolean>();

    private idbSet: (idb: IDBDatabase) => void = null!;
    private readonly idb = new Promise<IDBDatabase>(resolve => this.idbSet = resolve);
    
    constructor(
        private readonly storeName: string,
    ) {}

    public init(idb: Promise<IDBDatabase>) {
        idb.then(this.idbSet);
    }
    
    public async write(item: T) {
        const idb = await this.idb;
        return new Promise<void>((resolve, reject) => {
            const transaction = idb.transaction(this.storeName, "readwrite");
            const store = transaction.objectStore(this.storeName);
            store.put(item);
            transaction.oncomplete = () => resolve();
            transaction.onerror = err => reject(err);
        });
    }

    public async writeMany(items: T[]) {
        if (items.length === 0) return Promise.resolve();
        const idb = await this.idb;
        return new Promise<void>((resolve, reject) => {
            const transaction = idb.transaction(this.storeName, "readwrite");
            const store = transaction.objectStore(this.storeName);
            for (const row of items) store.put(row);
            transaction.oncomplete = () => resolve();
            transaction.onerror = err => reject(err);
        });
    }

    public async read<I = T>(key: number | string) {
        const idb = await this.idb;
        return new Promise<I | undefined>((resolve, reject) => {
            const transaction = idb.transaction(this.storeName, "readonly");
            const store = transaction.objectStore(this.storeName);
            const req = store.get(key);
            req.onsuccess = () => resolve(req.result);
            req.onerror = err => reject(err);
        });
    }

    public async readMany(keys: number[]) {
        if (keys.length === 0) return Promise.resolve([]);
        const idb = await this.idb;
        return new Promise<(T | undefined)[]>((resolve, reject) => {
            const transaction = idb.transaction(this.storeName, "readonly");
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

    public async readAll() {
        const idb = await this.idb;
        return new Promise<T[]>((resolve, reject) => {
            const transaction = idb.transaction(this.storeName, "readonly");
            const store = transaction.objectStore(this.storeName);
            const req = store.getAll();
            req.onsuccess = () => resolve(req.result);
            req.onerror = err => reject(err);
        });
    }

    public async findLargestId() {
        const idb = await this.idb;
        return new Promise<number | undefined>((resolve, reject) => {
            const transaction = idb.transaction(this.storeName, "readonly");
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

    public async delete(key: number | string) {
        const idb = await this.idb;
        return new Promise<void>((resolve, reject) => {
            const transaction = idb.transaction(this.storeName, "readwrite");
            const store = transaction.objectStore(this.storeName);
            store.delete(key);
            transaction.oncomplete = () => resolve();
            transaction.onerror = err => reject(err);
        });
    }

    public async deleteMany(keys: number[]) {
        if (keys.length === 0) return Promise.resolve();
        const idb = await this.idb;
        return new Promise<void>((resolve, reject) => {
            const transaction = idb.transaction(this.storeName, "readwrite");
            const store = transaction.objectStore(this.storeName);
            for (const key of keys) store.delete(key);
            transaction.oncomplete = () => resolve();
            transaction.onerror = err => reject(err);
        });
    }

    public async clear() {
        const idb = await this.idb;
        return new Promise<void>((resolve, reject) => {
            const transaction = idb.transaction(this.storeName, "readwrite");
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

    public async getIndex(indexName: string) {
        const idb = await this.idb;
        const transaction = idb.transaction(this.storeName, "readonly");
        const store = transaction.objectStore(this.storeName);
        if (!store.indexNames.contains(indexName))
            throw new Error(`"${this.storeName}" store doesn't have an index for "${indexName}"`);
        return store.index(indexName) as IDBIndex;
    }
}
