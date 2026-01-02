import { AsyncState } from "../../async-state";
import { EventEmitter } from "../event-emitter";
import { Change } from "../supa-sync.types";

export function idbBoolToNumber(value: boolean | null) {
    switch (value) {
        case true: return 1;
        case false: return -1;
        default: return 0;        
    }
}

export function idbNumberToBool(value: number | null) {
    switch (value) {
        case 1: return true;
        case -1: return false;
        default: return null;
    }
}

export class IDBStoreAdapter<T> {

    public readonly onChangeReceived = new EventEmitter<Change<T>[]>();
    public writeSubscriptions = 0;
    public readonly initialized = new AsyncState<boolean>();
    public mappingInFunction?: ((item: T) => T);
    public mappingOutFunction?: ((item: T) => T);
    
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
        if (this.mappingInFunction)
            item = this.mappingInFunction(item);
        await idb.transaction(this.storeName, "readwrite")
            .toPromise(store => store.put(item));
    }

    public async writeMany(items: T[], deleteIds?: number[]): Promise<undefined> {
        if (items.length === 0) return;
        const idb = await this.idb;
        if (this.mappingInFunction)
            items = items.map(item => this.mappingInFunction!(item));
        await idb.transaction(this.storeName, "readwrite")
            .toPromise(store => {
                for (const item of items) store.put(item);
                for (const id of deleteIds ?? []) store.delete(id);
            });
    }

    public async writeAndGet(items: T[], deletes?: T[]): Promise<Change<T>[]> {
        if (items.length === 0) return [];
        const idb = await this.idb;
        if (this.mappingInFunction)
            items = items.map(item => this.mappingInFunction!(item));
        return await idb.transaction(this.storeName, 'readwrite')
            .toPromise(store => {
                const itemUpdateProm = Promise.all(items.map(item => Promise.all([
                    store.get(item[store.keyPath as keyof T] as IDBValidKey).toPromise<T | undefined>()
                    .then(old => this.mappingOutFunction && old ? this.mappingOutFunction(old) : old),
                    store.put(item).toPromise(),
                ]).then(([old]) => ({ old, new: item }))))
                const deleteProm = Promise.all((deletes ?? []).map(item => Promise.all([
                    store.get(item[store.keyPath as keyof T] as IDBValidKey).toPromise<T | undefined>()
                    .then(old => this.mappingOutFunction && old ? this.mappingOutFunction(old) : old),
                    store.delete(item[store.keyPath as keyof T] as IDBValidKey).toPromise(),
                ]).then(([old]) => ({ old, new: undefined }))));
                return Promise.all([itemUpdateProm, deleteProm]);
            }).then(([items, deletions]) => [...items, ...deletions]);
    }

    public abort() {
        for (const callback of this.abortCallbacks)
            callback();
    }

    public async read<I = T>(key: IDBValidKey) {
        const idb = await this.idb;
        return await idb.transaction(this.storeName, "readonly")
            .toPromise(store => store.get(key).toPromise<I>())
            .then(row => this.mappingOutFunction && row ? this.mappingOutFunction(<T>row) : row);
    }

    public async readMany(keys: IDBValidKey[], abortSignal?: AbortSignal) {
        if (keys.length === 0) return Promise.resolve([]);
        const idb = await this.idb;
        return await idb.transaction(this.storeName, "readonly")
            .abortOn(abortSignal)
            .toPromise(store => Promise.all(keys.map(key => store.get(key).toPromise<T>()))
                .then(rows => this.mappingOutFunction ? rows.map(row => this.mappingOutFunction!(row)) : rows));
    }

    public async readAll(abortSignal?: AbortSignal) {
        const idb = await this.idb;
        return await idb.transaction(this.storeName, "readonly")
            .abortOn(abortSignal)
            .toPromise(store => store.getAll().toPromise<T[]>()
                .then(rows => this.mappingOutFunction ? rows.map(row => this.mappingOutFunction!(row)) : rows));
    }

    public async readAllKeys(abortSignal?: AbortSignal) {
        const idb = await this.idb;
        return await idb.transaction(this.storeName, "readonly")
            .abortOn(abortSignal)
            .toPromise(store => store.getAllKeys().toPromise());
    }

    public async findLargestId() {
        const idb = await this.idb;
        return await idb.transaction(this.storeName, "readonly")
            .toPromise(store => store.index('id')
                .openKeyCursor(null, 'prev').toPromise()
                .then(cursor => cursor?.key as number | undefined));
    }

    public async delete(key: number) {
        const idb = await this.idb;
        await idb.transaction(this.storeName, "readwrite")
            .toPromise(store => store.delete(key).toPromise());
    }

    public async deleteMany(keys: number[]) {
        if (keys.length === 0) return Promise.resolve();
        const idb = await this.idb;
        await idb.transaction(this.storeName, "readwrite")
            .toPromise(store => keys.forEach(key => store.delete(key)));
    }

    public async clear() {
        const idb = await this.idb;
        await idb.transaction(this.storeName, "readwrite")
            .toPromise(store => store.clear());
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
        const store = idb.transaction(this.storeName, "readonly").objectStore(this.storeName);
        if (!store.indexNames.contains(indexName))
            throw new Error(`"${this.storeName}" store doesn't have an index for "${indexName}".\n
                Add "${indexName}" to the indexed array of the tableInfo that is passed to the SupaSync constructor.`);
        return store.index(indexName) as IDBIndex;
    }
}

declare global {
    interface IDBRequest<T = any> {
        toPromise<R = T>(): Promise<R>;
    }
    interface IDBTransaction<T = any> {
        toPromise<R = T>(fn: (store: IDBObjectStore) => R | Promise<R>): Promise<R>;
        abortOn(abortSignal: AbortSignal | undefined): this;
    }
}

IDBRequest.prototype.toPromise = function<T>(this: IDBRequest<T>) {
    return new Promise<T>((resolve, reject) => {
        this.onsuccess = () => resolve(this.result);
        this.onerror = () => reject(this.error);
    });
};

IDBTransaction.prototype.toPromise = function<T>(this: IDBTransaction<T>, fn: (store: IDBObjectStore) => T | Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        const store = this.objectStore(this.objectStoreNames[0]);
        const resultPromise = fn(store);
        this.onabort = () => reject(this.error);
        this.oncomplete = async () => resolve(await resultPromise);
        this.onerror = () => reject(this.error);
    });
};
IDBTransaction.prototype.abortOn = function<T>(this: IDBTransaction<T>, abortSignal: AbortSignal | undefined): IDBTransaction<T> {
    if (abortSignal) abortSignal.onabort = this.abort.bind(this);
    return this;
};
