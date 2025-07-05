import { AsyncState } from "../../async-state";

export class IDBStoreAdapter<T> {

    private static idb = new AsyncState<IDBDatabase>();

    public static setup(name: string, version: number, storeNames: string[]) {
        const request = indexedDB.open(name, version);
        request.onupgradeneeded = (event) => {
            const idb = (event.target as IDBOpenDBRequest).result;
            for (const storeName of storeNames)
                if (!idb.objectStoreNames.contains(storeName))
                    idb.createObjectStore(storeName, { keyPath: 'id' });
            IDBStoreAdapter.idb.set(idb);
        };
        request.onsuccess = (event) => {
            IDBStoreAdapter.idb.set((event.target as IDBOpenDBRequest).result);
        };
        request.onerror = (event) => {
            console.error("Error opening IndexedDB:", (event.target as IDBOpenDBRequest).error);
        };
    }

    constructor(
        private readonly storeName: string,
    ) {}
    
    public async write(item: T) {
        const idb = await IDBStoreAdapter.idb.get();
        return await new Promise<void>((resolve, reject) => {
            const transaction = idb.transaction(this.storeName, "readwrite");
            const store = transaction.objectStore(this.storeName);
            store.put(item);
            transaction.oncomplete = () => resolve();
            transaction.onerror = err => reject(err);
        });
    }

    public async writeMany(items: T[]) {
        if (items.length === 0) return;
        const idb = await IDBStoreAdapter.idb.get();
        return await new Promise<void>((resolve, reject) => {
            const transaction = idb.transaction(this.storeName, "readwrite");
            const store = transaction.objectStore(this.storeName);
            for (const row of items) store.put(row);
            transaction.oncomplete = () => resolve();
            transaction.onerror = err => reject(err);
        });
    }

    public async read<I = T>(key: number | string) {
        const idb = await IDBStoreAdapter.idb.get();
        return await new Promise<I | undefined>((resolve, reject) => {
            const transaction = idb.transaction(this.storeName, "readonly");
            const store = transaction.objectStore(this.storeName);
            const req = store.get(key);
            req.onsuccess = () => resolve(req.result);
            req.onerror = err => reject(err);
        });
    }

    public async readMany(keys: number[]) {
        if (keys.length === 0) return [];
        const idb = await IDBStoreAdapter.idb.get();
        return await new Promise<(T | undefined)[]>((resolve, reject) => {
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

    public async lock(safeFunc: () => Promise<void>, timeout = 5000) {
        await navigator.locks.request(this.storeName, async () => Promise.race([
            safeFunc(),
            new Promise<void>((_, reject) => setTimeout(
                () => reject(new Error(`Lock timeout for ${this.storeName}`)),
                timeout
            )),
        ]));
    }
}