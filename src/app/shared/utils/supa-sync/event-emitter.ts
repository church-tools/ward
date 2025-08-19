
class UnsafeSortedSet {

    private readonly elements: number[] = [];

    add(value: number) {
        let left = 0;
        let right = this.elements.length - 1;
        while (left <= right) {
            const mid = Math.floor((left + right) / 2);
            if (this.elements[mid] === value) return;
            if (this.elements[mid] < value) left = mid + 1;
            else right = mid - 1;
        }
        this.elements.splice(left, 0, value);
    }

    pop(): number | undefined {
        return this.elements.pop();
    }

    get first(): number | undefined {
        return this.elements[0];
    }

    get last(): number | undefined {
        return this.elements[this.elements.length - 1];
    }
}

export type Subscription = {
    unsubscribe: () => void;
};

export class EventEmitter<T> {

    private readonly listeners: ((event: T) => any)[] = [];
    private readonly freeIndexes = new UnsafeSortedSet();
    public get hasSubscriptions(): boolean { return this.listeners.length > 0; }

    emit(event: T) {
        for (const listener of this.listeners)
            listener(event);
    }
    
    subscribe(callback: (event: T) => any): Subscription {
        const index = this.freeIndexes.first ?? this.listeners.length;
        this.listeners[index] = callback;
        return {
            unsubscribe: () => {
                delete this.listeners[index];
                if (index === this.listeners.length - 1) {
                    this.listeners.pop();
                    while (this.freeIndexes.last === this.listeners.length - 1) {
                        this.freeIndexes.pop();
                        this.listeners.pop();
                    }
                }
                this.freeIndexes.add(index);
            }
        };
    }
}
