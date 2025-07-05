
export class AsyncState<T> {

    private value: T | undefined;
    private readonly onDone: (() => void)[] = [];

    constructor(emptyValue?: T) {
        this.value = emptyValue;
    }

    async get(): Promise<T> {
        if (this.value === undefined)
            await new Promise<void>(resolve => this.onDone.push(resolve));
        return this.value!;
    }

    unsafeGet(): T | undefined {
        return this.value;
    }

    set(value: T) {
        this.value = value;
        for (const callback of this.onDone) callback();
        this.onDone.length = 0;
    }

    unset() {
        this.value = undefined;
    }
}