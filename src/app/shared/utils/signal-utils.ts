import { computed, CreateEffectOptions, effect, signal, Signal } from "@angular/core";


export function xcomputed<T, D1, D2, D3, D4, D5, D6, D7, D8, D9>(
    dependencies: [Signal<D1>, Signal<D2>?, Signal<D3>?, Signal<D4>?, Signal<D5>?, Signal<D6>?, Signal<D7>?, Signal<D8>?, Signal<D9>?],
    computation: (value1: D1, value2?: D2, value3?: D3, value4?: D4, value5?: D5, value6?: D6, value7?: D7, value8?: D8, value9?: D9) => T) {
    return computed(() => {
        const values = dependencies.map(d => d ? d() : undefined);
        return computation(...<[D1, D2, D3, D4, D5, D6, D7, D8, D9]>values);
    });
}

export function asyncComputed<T, D1, D2, D3, D4, D5, D6, D7, D8, D9>(
    dependencies: [Signal<D1>, Signal<D2>?, Signal<D3>?, Signal<D4>?, Signal<D5>?, Signal<D6>?, Signal<D7>?, Signal<D8>?, Signal<D9>?],
    computation: (value1: D1, value2?: D2, value3?: D3, value4?: D4, value5?: D5, value6?: D6, value7?: D7, value8?: D8, value9?: D9) => Promise<T>,
    defaultValue?: T) {
    const s = signal<T | undefined>(defaultValue);
    effect(() => {
        const values = dependencies.map(d => d ? d() : undefined);
        computation(...<[D1, D2, D3, D4, D5, D6, D7, D8, D9]>values).then(result => s.set(result));
    });
    return s.asReadonly();
}

export function xeffect<T, D1, D2, D3, D4, D5, D6, D7, D8, D9>(
    dependencies: [Signal<D1>, Signal<D2>?, Signal<D3>?, Signal<D4>?, Signal<D5>?, Signal<D6>?, Signal<D7>?, Signal<D8>?, Signal<D9>?],
    effectFn: (value1: D1, value2?: D2, value3?: D3, value4?: D4, value5?: D5, value6?: D6, value7?: D7, value8?: D8, value9?: D9) => T,
    options?: CreateEffectOptions & { skipFirst?: boolean }) {
    let lastValues: [D1, D2, D3, D4, D5, D6, D7, D8, D9] | null = null;
    let first = options?.skipFirst;
    const effectRef = effect(() => {
        const values = dependencies.map(d => d ? d() : undefined);
        if (lastValues?.every((v, i) => v === values[i]))
            return;
        lastValues = <[D1, D2, D3, D4, D5, D6, D7, D8, D9]>values;
        if (first) {
            first = false;
            return;
        }
        effectFn(...<[D1, D2, D3, D4, D5, D6, D7, D8, D9]>values);
    }, options);
    return { effectRef, fn: () => {
        const values = dependencies.map(d => d ? d() : undefined);
        return effectFn(...<[D1, D2, D3, D4, D5, D6, D7, D8, D9]>values);
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