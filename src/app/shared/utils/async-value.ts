
import { signal } from "@angular/core";

export class AsyncValue<T> {

    private value: T | undefined;
    private readonly _locked = signal(true);
    public readonly locked = this._locked.asReadonly();
    private readonly onDone: (() => void)[] = [];

    constructor(private readonly emptyValue?: T, private readonly clearIfFalse = false) {
        this.value = emptyValue;
    }

    async get(): Promise<T> {
        if (this.locked())
            await new Promise<void>(resolve => this.onDone.push(resolve));
        return this.value!;
    }

    unsafeGet(): T | undefined {
        return this.value;
    }

    set(value: T, unlock = true) {
        this.value = value;
        if (this.clearIfFalse && !value) this.clear();
        else if (unlock) this.unlock();
    }

    lock() {
        this._locked.set(true);
    }

    unlock() {
        for (const callback of this.onDone) callback();
        this.onDone.length = 0;
        this._locked.set(false);
    }

    clear() {
        this.value = this.emptyValue;
        this._locked.set(true);
    }
}