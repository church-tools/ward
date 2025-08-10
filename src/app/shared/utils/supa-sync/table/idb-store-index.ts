import { Database, SupaSyncQuery, SupaSyncQueryValue, TableName } from "../supa-sync";

export class IdbStoreIndex<D extends Database, T extends TableName<D>> {

    private readonly index: IDBIndex;

    constructor(idb: IDBDatabase, storeName: T, indexName: string) {
        const transaction = idb.transaction(storeName, "readonly");
        const store = transaction.objectStore(storeName);
        if (!store.indexNames.contains(indexName))
            throw new Error(`Index "${indexName}" not found in store "${storeName}"`);
        this.index = store.index(indexName);
    }

    query<K extends keyof SupaSyncQuery<D, T>>(attributeQuery: SupaSyncQuery<D, T>[K]) {
        if (typeof attributeQuery === 'object') {
            const queryValue = attributeQuery as SupaSyncQueryValue<D, T, K>;
            if ('in' in queryValue) {
                const list = queryValue.in;
                const requests = queryValue.in.map(this.index.getAll);
                await Promise.all(requests.map(this.getResult.bind(this)))
            }
            for (const key in attributeQuery) {
                switch (key) {
                    case 'in':

                }
            }
        }
    }

}

// extension function for IDBRequest to await result
IDBRequest.prototype.getResult = () => {
    
}