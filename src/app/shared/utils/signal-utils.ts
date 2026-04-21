import { computed, CreateEffectOptions, effect, Injector, signal, Signal, untracked, WritableSignal } from "@angular/core";

export type AwaitableSignal<T> = Signal<T> & { asPromise: () => Promise<Exclude<T, null>>, nextChangeAsPromise: () => Promise<T> };
export type AwaitableWritableSignal<T> = WritableSignal<T> & { asPromise: () => Promise<Exclude<T, null>>, nextChangeAsPromise: () => Promise<T> };

type StrictUnwrap<T> = T extends Signal<infer U> 
    ? (null extends U ? U : undefined extends U ? U : Exclude<U, null | undefined>)
    : never;

export function xsignal<T>(initialValue: T | null = null) {
    const s = signal<T | null>(initialValue);
    let initialized: (value: Exclude<T, null> | PromiseLike<Exclude<T, null>>) => void;
    const initPromise = new Promise<Exclude<T, null>>(resolve => initialized = resolve);
    const set = s.set.bind(s);
    const update = s.update.bind(s);
    let nextChangeWaiters: ((value: T) => void)[] = [];

    const notifyNextChange = (value: T | null) => {
        if (nextChangeWaiters.length === 0)
            return;
        const waiters = nextChangeWaiters;
        nextChangeWaiters = [];
        for (const resolve of waiters)
            resolve(value as T);
    };

    const rs = s as any as AwaitableWritableSignal<T>;
    rs.set = (value: T) => {
        set(value);
        if (value != null)
            initialized(value as Exclude<T, null>);
        notifyNextChange(value);
    };
    rs.update = ((updateFn: (value: T) => T) => {
        let nextValue: T | null = null;
        update(currentValue => {
            const newVal = updateFn(currentValue as T);
            nextValue = newVal;
            return newVal as any;
        });
        if (nextValue != null)
            initialized(nextValue as Exclude<T, null>);
        notifyNextChange(nextValue);
    }) as any;
    rs.asPromise = () => initPromise;
    rs.nextChangeAsPromise = () => new Promise<T>(resolve => {
        nextChangeWaiters.push(resolve);
    });
    return rs;
}

type V<D> = StrictUnwrap<Signal<D>>;

export function xcomputed<T, D1>(
    dependencies: [Signal<D1>],
    computation: (value1: V<D1>) => T,
    options?: { trackInner?: boolean }
): Signal<T>;
export function xcomputed<T, D1, D2>(
    dependencies: [Signal<D1>, Signal<D2>],
    computation: (value1: V<D1>, value2: V<D2>) => T,
    options?: { trackInner?: boolean }
): Signal<T>;
export function xcomputed<T, D1, D2, D3>(
    dependencies: [Signal<D1>, Signal<D2>, Signal<D3>],
    computation: (value1: V<D1>, value2: V<D2>, value3: V<D3>) => T,
    options?: { trackInner?: boolean }
): Signal<T>;
export function xcomputed<T, D1, D2, D3, D4>(
    dependencies: [Signal<D1>, Signal<D2>, Signal<D3>, Signal<D4>],
    computation: (value1: V<D1>, value2: V<D2>, value3: V<D3>, value4: V<D4>) => T,
    options?: { trackInner?: boolean }
): Signal<T>;
export function xcomputed<T, D1, D2, D3, D4, D5>(
    dependencies: [Signal<D1>, Signal<D2>, Signal<D3>, Signal<D4>, Signal<D5>],
    computation: (value1: V<D1>, value2: V<D2>, value3: V<D3>, value4: V<D4>, value5: V<D5>) => T,
    options?: { trackInner?: boolean }
): Signal<T>;
export function xcomputed<T, D1, D2, D3, D4, D5, D6>(
    dependencies: [Signal<D1>, Signal<D2>, Signal<D3>, Signal<D4>, Signal<D5>, Signal<D6>],
    computation: (value1: V<D1>, value2: V<D2>, value3: V<D3>, value4: V<D4>, value5: V<D5>, value6: V<D6>) => T,
    options?: { trackInner?: boolean }
): Signal<T>;
export function xcomputed<T, D1, D2, D3, D4, D5, D6, D7>(
    dependencies: [Signal<D1>, Signal<D2>, Signal<D3>, Signal<D4>, Signal<D5>, Signal<D6>, Signal<D7>],
    computation: (value1: V<D1>, value2: V<D2>, value3: V<D3>, value4: V<D4>, value5: V<D5>, value6: V<D6>, value7: V<D7>) => T,
    options?: { trackInner?: boolean }
): Signal<T>;
export function xcomputed<T, D1, D2, D3, D4, D5, D6, D7, D8>(
    dependencies: [Signal<D1>, Signal<D2>, Signal<D3>, Signal<D4>, Signal<D5>, Signal<D6>, Signal<D7>, Signal<D8>],
    computation: (value1: V<D1>, value2: V<D2>, value3: V<D3>, value4: V<D4>, value5: V<D5>, value6: V<D6>, value7: V<D7>, value8: V<D8>) => T,
    options?: { trackInner?: boolean }
): Signal<T>;
export function xcomputed<T, D1, D2, D3, D4, D5, D6, D7, D8, D9>(
    dependencies: [Signal<D1>, Signal<D2>, Signal<D3>, Signal<D4>, Signal<D5>, Signal<D6>, Signal<D7>, Signal<D8>, Signal<D9>],
    computation: (value1: V<D1>, value2: V<D2>, value3: V<D3>, value4: V<D4>, value5: V<D5>, value6: V<D6>, value7: V<D7>, value8: V<D8>, value9: V<D9>) => T,
    options?: { trackInner?: boolean }
): Signal<T>;
export function xcomputed<T>(
    dependencies: (Signal<any> | undefined)[],
    computation: (...values: any[]) => T,
    options?: { trackInner?: boolean }
): Signal<T> {
    return computed(() => {
        const values = dependencies.map(d => d ? d() : null);
        return options?.trackInner
            ? computation(...values)
            : untracked(() => computation(...values));
    });
}

export function asyncComputed<T, Default = T>(
    dependencies: [],
    computation: () => Promise<T>,
    defaultValue?: T | Default
): AwaitableSignal<T | Default>;
export function asyncComputed<T, D1, Default = T>(
    dependencies: [Signal<D1>],
    computation: (value1: V<D1>) => Promise<T>,
    defaultValue?: T | Default
): AwaitableSignal<T | Default>;
export function asyncComputed<T, D1, D2, Default = T>(
    dependencies: [Signal<D1>, Signal<D2>],
    computation: (value1: V<D1>, value2: V<D2>) => Promise<T>,
    defaultValue?: T | Default
): AwaitableSignal<T | Default>;
export function asyncComputed<T, D1, D2, D3, Default = T>(
    dependencies: [Signal<D1>, Signal<D2>, Signal<D3>],
    computation: (value1: V<D1>, value2: V<D2>, value3: V<D3>) => Promise<T>,
    defaultValue?: T | Default
): AwaitableSignal<T | Default>;
export function asyncComputed<T, D1, D2, D3, D4, Default = T>(
    dependencies: [Signal<D1>, Signal<D2>, Signal<D3>, Signal<D4>],
    computation: (value1: V<D1>, value2: V<D2>, value3: V<D3>, value4: V<D4>) => Promise<T>,
    defaultValue?: T | Default
): AwaitableSignal<T | Default>;
export function asyncComputed<T, D1, D2, D3, D4, D5, Default = T>(
    dependencies: [Signal<D1>, Signal<D2>, Signal<D3>, Signal<D4>, Signal<D5>],
    computation: (value1: V<D1>, value2: V<D2>, value3: V<D3>, value4: V<D4>, value5: V<D5>) => Promise<T>,
    defaultValue?: T | Default
): AwaitableSignal<T | Default>;
export function asyncComputed<T, D1, D2, D3, D4, D5, D6, Default = T>(
    dependencies: [Signal<D1>, Signal<D2>, Signal<D3>, Signal<D4>, Signal<D5>, Signal<D6>],
    computation: (value1: V<D1>, value2: V<D2>, value3: V<D3>, value4: V<D4>, value5: V<D5>, value6: V<D6>) => Promise<T>,
    defaultValue?: T | Default
): AwaitableSignal<T | Default>;
export function asyncComputed<T, D1, D2, D3, D4, D5, D6, D7, Default = T>(
    dependencies: [Signal<D1>, Signal<D2>, Signal<D3>, Signal<D4>, Signal<D5>, Signal<D6>, Signal<D7>],
    computation: (value1: V<D1>, value2: V<D2>, value3: V<D3>, value4: V<D4>, value5: V<D5>, value6: V<D6>, value7: V<D7>) => Promise<T>,
    defaultValue?: T | Default
): AwaitableSignal<T | Default>;
export function asyncComputed<T, D1, D2, D3, D4, D5, D6, D7, D8, Default = T>(
    dependencies: [Signal<D1>, Signal<D2>, Signal<D3>, Signal<D4>, Signal<D5>, Signal<D6>, Signal<D7>, Signal<D8>],
    computation: (value1: V<D1>, value2: V<D2>, value3: V<D3>, value4: V<D4>, value5: V<D5>, value6: V<D6>, value7: V<D7>, value8: V<D8>) => Promise<T>,
    defaultValue?: T | Default
): AwaitableSignal<T | Default>;
export function asyncComputed<T, D1, D2, D3, D4, D5, D6, D7, D8, D9, Default = T>(
    dependencies: [Signal<D1>, Signal<D2>, Signal<D3>, Signal<D4>, Signal<D5>, Signal<D6>, Signal<D7>, Signal<D8>, Signal<D9>],
    computation: (value1: V<D1>, value2: V<D2>, value3: V<D3>, value4: V<D4>, value5: V<D5>, value6: V<D6>, value7: V<D7>, value8: V<D8>, value9: V<D9>) => Promise<T>,
    defaultValue?: T | Default
): AwaitableSignal<T | Default>;
export function asyncComputed<T, Default = T>(
    dependencies: (Signal<any> | undefined)[],
    computation: (...values: any[]) => Promise<T>,
    defaultValue: T | Default = null as any
): AwaitableSignal<T | Default> {
    const s = signal<T | Default>(defaultValue);
    let initialized: (value: Exclude<T, null> | PromiseLike<Exclude<T, null>>) => void;
    const initPromise = new Promise<Exclude<T, null>>(resolve => initialized = resolve);
    effect(() => {
        const values = dependencies.map(d => d ? d() : null);
        computation(...values).then(result => {
            s.set(result);
            if (result != null)
                initialized?.(result as Exclude<T, null>);
        });
    });
    const rs = s.asReadonly() as AwaitableSignal<T | Default>;
    rs.asPromise = () => initPromise;
    return rs;
}

export function xeffect<T, D1>(
    dependencies: [Signal<D1>],
    effectFn: (value1: V<D1>) => T,
    options?: CreateEffectOptions & { skipFirst?: boolean, untracked?: boolean }
): { effectRef: any, fn: () => T };
export function xeffect<T, D1, D2>(
    dependencies: [Signal<D1>, Signal<D2>],
    effectFn: (value1: V<D1>, value2: V<D2>) => T,
    options?: CreateEffectOptions & { skipFirst?: boolean, untracked?: boolean }
): { effectRef: any, fn: () => T };
export function xeffect<T, D1, D2, D3>(
    dependencies: [Signal<D1>, Signal<D2>, Signal<D3>],
    effectFn: (value1: V<D1>, value2: V<D2>, value3: V<D3>) => T,
    options?: CreateEffectOptions & { skipFirst?: boolean, untracked?: boolean }
): { effectRef: any, fn: () => T };
export function xeffect<T, D1, D2, D3, D4>(
    dependencies: [Signal<D1>, Signal<D2>, Signal<D3>, Signal<D4>],
    effectFn: (value1: V<D1>, value2: V<D2>, value3: V<D3>, value4: V<D4>) => T,
    options?: CreateEffectOptions & { skipFirst?: boolean, untracked?: boolean }
): { effectRef: any, fn: () => T };
export function xeffect<T, D1, D2, D3, D4, D5>(
    dependencies: [Signal<D1>, Signal<D2>, Signal<D3>, Signal<D4>, Signal<D5>],
    effectFn: (value1: V<D1>, value2: V<D2>, value3: V<D3>, value4: V<D4>, value5: V<D5>) => T,
    options?: CreateEffectOptions & { skipFirst?: boolean, untracked?: boolean }
): { effectRef: any, fn: () => T };
export function xeffect<T, D1, D2, D3, D4, D5, D6>(
    dependencies: [Signal<D1>, Signal<D2>, Signal<D3>, Signal<D4>, Signal<D5>, Signal<D6>],
    effectFn: (value1: V<D1>, value2: V<D2>, value3: V<D3>, value4: V<D4>, value5: V<D5>, value6: V<D6>) => T,
    options?: CreateEffectOptions & { skipFirst?: boolean, untracked?: boolean }
): { effectRef: any, fn: () => T };
export function xeffect<T, D1, D2, D3, D4, D5, D6, D7>(
    dependencies: [Signal<D1>, Signal<D2>, Signal<D3>, Signal<D4>, Signal<D5>, Signal<D6>, Signal<D7>],
    effectFn: (value1: V<D1>, value2: V<D2>, value3: V<D3>, value4: V<D4>, value5: V<D5>, value6: V<D6>, value7: V<D7>) => T,
    options?: CreateEffectOptions & { skipFirst?: boolean, untracked?: boolean }
): { effectRef: any, fn: () => T };
export function xeffect<T, D1, D2, D3, D4, D5, D6, D7, D8>(
    dependencies: [Signal<D1>, Signal<D2>, Signal<D3>, Signal<D4>, Signal<D5>, Signal<D6>, Signal<D7>, Signal<D8>],
    effectFn: (value1: V<D1>, value2: V<D2>, value3: V<D3>, value4: V<D4>, value5: V<D5>, value6: V<D6>, value7: V<D7>, value8: V<D8>) => T,
    options?: CreateEffectOptions & { skipFirst?: boolean, untracked?: boolean }
): { effectRef: any, fn: () => T };
export function xeffect<T, D1, D2, D3, D4, D5, D6, D7, D8, D9>(
    dependencies: [Signal<D1>, Signal<D2>, Signal<D3>, Signal<D4>, Signal<D5>, Signal<D6>, Signal<D7>, Signal<D8>, Signal<D9>],
    effectFn: (value1: V<D1>, value2: V<D2>, value3: V<D3>, value4: V<D4>, value5: V<D5>, value6: V<D6>, value7: V<D7>, value8: V<D8>, value9: V<D9>) => T,
    options?: CreateEffectOptions & { skipFirst?: boolean, untracked?: boolean }
): { effectRef: any, fn: () => T };
export function xeffect<T>(
    dependencies: (Signal<any> | undefined)[],
    effectFn: (...values: any[]) => T,
    options?: CreateEffectOptions & { skipFirst?: boolean, trackFn?: boolean }
): { effectRef: any, fn: () => T } {
    let lastValues: any[] | null = null;
    let first = options?.skipFirst;
    const effectRef = effect(() => {
        const values = dependencies.map(d => d ? d() : null);
        if (lastValues?.every((v, i) => v === values[i]))
            return;
        lastValues = values;
        if (first) {
            first = false;
            return;
        }
        effectFn(...values);
    }, options);
    return { effectRef, fn: () => {
        const values = dependencies.map(d => d ? d() : null);
        return options?.trackFn ? effectFn(...values) : untracked(() => effectFn(...values));
    }};
}

export function property<T extends object, K extends keyof T>(parent: Signal<T | null>, prop: K) {
    const s = signal<T[K] | null>(null);
    const { set, update } = s;
    effect(() => {
        const value = parent();
        set(value?.[prop] ?? null);
    });
    s.set = (value: T[K]) => {
        const parentValue = parent();
        if (!parentValue) return;
        if (parentValue[prop] === value && Array.isArray(value))
            value = <T[K]>[...value]; // Ensure a new array reference
        parentValue[prop] = value;
        set(value);
    };
    s.update = (updateFn: (value: T[K] | null) => T[K]) => update(value => {
        const newValue = updateFn(value);
        const parentValue = parent();
        if (parentValue)
            parentValue[prop] = newValue;
        return newValue;
    });
    return s;
}

export function waitForNextChange<T>(signal: Signal<T>, injector: Injector): Promise<T> {
    return new Promise<T>(resolve => {
        const currentValue = signal();
        const effectRef = effect(() => {
            const newValue = signal();
            if (newValue !== currentValue) {
                effectRef.destroy();
                resolve(newValue);
            }
        }, { injector });
    });
}

export type PendingValueTracker<T> = {
    mark: (value: T) => void;
    shouldIgnore: (value: T) => boolean;
    clear: () => void;
};

export function createPendingValueTracker<T>(settleMs = 150): PendingValueTracker<T> {
    let pendingValue: T | undefined = undefined;
    let pendingValueSetAt = 0;

    const clear = () => {
        pendingValue = undefined;
        pendingValueSetAt = 0;
    };

    return {
        mark: (value: T) => {
            pendingValue = value;
            pendingValueSetAt = Date.now();
        },
        shouldIgnore: (value: T) => {
            if (pendingValue === undefined)
                return false;
            if (Object.is(value, pendingValue)) {
                if ((Date.now() - pendingValueSetAt) < settleMs)
                    return true;
                clear();
                return false;
            }
            return true;
        },
        clear,
    };
}