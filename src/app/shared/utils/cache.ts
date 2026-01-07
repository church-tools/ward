
export class Cache<K, V> {

    private readonly store = new Map<K, V>();
    private readonly keysInOrder: K[] = [];

    constructor(private readonly maxSize: number) {}

    get(key: K): V | undefined {
        return this.store.get(key);
    }

    set(key: K, value: V): void {
        if (this.store.has(key)) {
            this.store.set(key, value);
            return;
        }
        this.store.set(key, value);
        this.keysInOrder.push(key);
        if (this.keysInOrder.length > this.maxSize) {
            const oldestKey = this.keysInOrder.shift()!;
            this.store.delete(oldestKey);
        }
    }
}
