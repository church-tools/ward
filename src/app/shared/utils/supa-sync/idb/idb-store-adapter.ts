import { AsyncState } from "../../async-state";
import { EventEmitter } from "../event-emitter";
import { Change } from "../supa-sync.types";

export class IDBStoreAdapter<T> {

    public readonly onChangeReceived = new EventEmitter<Change<T>[]>();
    public writeSubscriptions = 0;
    public readonly initialized = new AsyncState<boolean>();
    
    private idbSet: (idb: IDBDatabase) => void = null!;
    private readonly idb = new Promise<IDBDatabase>(resolve => this.idbSet = resolve);
    private readonly abortCallbacks: (() => void)[] = [];
    
    constructor(
        public readonly storeName: string,
    ) {}

    public init(idb: Promise<IDBDatabase>) {
        idb.then(this.idbSet);
    }
    
    public async write(item: T) {
        const idb = await this.idb;
        await new Promise<void>((resolve, reject) => {
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
        await new Promise<void>((resolve, reject) => {
            const transaction = idb.transaction(this.storeName, "readwrite");
            const store = transaction.objectStore(this.storeName);
            for (const row of items) store.put(row);
            transaction.oncomplete = () => resolve();
            transaction.onerror = err => reject(err);
        });
    }

    public async writeAndGet(items: T[]) {
        if (items.length === 0) return [] as { old: T | undefined, new: T }[];
        const idb = await this.idb;
        return new Promise<{ old: T | undefined, new: T }[]>((resolve, reject) => {
            const transaction = idb.transaction(this.storeName, 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const keyPath = store.keyPath as keyof T & string;
            const results = new Array<{ old: T | undefined, new: T }>(items.length);
            for (let i = 0; i < items.length; i++) {
                const row = items[i];
                const key = row[keyPath] as IDBValidKey;
                const getOld = store.get(key);
                getOld.onerror = () => reject(getOld.error);
                getOld.onsuccess = () => {
                    const putReq = store.put(row);
                    putReq.onerror = () => reject(putReq.error);
                    putReq.onsuccess = () => {
                        const getNew = store.get(putReq.result);
                        getNew.onerror = () => reject(getNew.error);
                        getNew.onsuccess = () => results[i] = { old: getOld.result, new: getNew.result as T };
                    };
                };
            }
            transaction.oncomplete = () => resolve(results);
            transaction.onerror = () => reject(transaction.error as any);
        });
    }

    public abort() {
        for (const callback of this.abortCallbacks)
            callback();
    }

    public async read<I = T>(key: IDBValidKey) {
        const idb = await this.idb;
        return new Promise<I | undefined>((resolve, reject) => {
            const transaction = idb.transaction(this.storeName, "readonly");
            const store = transaction.objectStore(this.storeName);
            const req = store.get(key);
            req.onsuccess = () => resolve(req.result);
            req.onerror = err => reject(err);
        });
    }

    public async readMany(keys: IDBValidKey[], abortSignal?: AbortSignal) {
        if (keys.length === 0) return Promise.resolve([]);
        const idb = await this.idb;
        return new Promise<(T | undefined)[]>((resolve, reject) => {
            const transaction = idb.transaction(this.storeName, "readonly");
            if (abortSignal) abortSignal.onabort = transaction.abort.bind(transaction);
            const store = transaction.objectStore(this.storeName);
            const results = new Array<T | undefined>(keys.length);
            for (let i = 0; i < keys.length; i++) {
                const req = store.get(keys[i]);
                req.onsuccess = () => results[i] = req.result;
                req.onerror = err => reject(err);
            }
            transaction.oncomplete = () => resolve(results);
        });
    }

    public async readAll(abortSignal?: AbortSignal) {
        const idb = await this.idb;
        return new Promise<T[]>((resolve, reject) => {
            const transaction = idb.transaction(this.storeName, "readonly");
            if (abortSignal) abortSignal.onabort = transaction.abort.bind(transaction);
            const store = transaction.objectStore(this.storeName);
            const req = store.getAll();
            req.onsuccess = () => resolve(req.result);
            req.onerror = err => reject(err);
        });
    }

    public async readAllKeys(abortSignal?: AbortSignal) {
        const idb = await this.idb;
        return new Promise<IDBValidKey[]>((resolve, reject) => {
            const transaction = idb.transaction(this.storeName, "readonly");
            if (abortSignal) abortSignal.onabort = transaction.abort.bind(transaction);
            const store = transaction.objectStore(this.storeName);
            const req = store.getAllKeys();
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

    public async delete(key: number) {
        const idb = await this.idb;
        await new Promise<void>((resolve, reject) => {
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
        await new Promise<void>((resolve, reject) => {
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

    public async getIndex(indexName: keyof T & string) {
        const idb = await this.idb;
        const transaction = idb.transaction(this.storeName, "readonly");
        const store = transaction.objectStore(this.storeName);
        if (!store.indexNames.contains(indexName))
            throw new Error(`"${this.storeName}" store doesn't have an index for "${indexName}"`);
        return store.index(indexName) as IDBIndex;
    }
}
