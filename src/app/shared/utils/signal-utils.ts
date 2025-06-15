import { computed, CreateEffectOptions, effect, signal, Signal } from "@angular/core";



export function multiComputed<T, D1, D2, D3, D4, D5, D6, D7, D8, D9>(
    dependencies: [Signal<D1>, Signal<D2>?, Signal<D3>?, Signal<D4>?, Signal<D5>?, Signal<D6>?, Signal<D7>?, Signal<D8>?, Signal<D9>?],
    computation: (value1: D1, value2?: D2, value3?: D3, value4?: D4, value5?: D5, value6?: D6, value7?: D7, value8?: D8, value9?: D9) => T) {
    return computed(() => computation(...<[D1, D2, D3, D4, D5, D6, D7, D8, D9]>dependencies.map(d => d?.())));
}

export function asyncComputed<T, D1, D2, D3, D4, D5, D6, D7, D8, D9>(
    dependencies: [Signal<D1>, Signal<D2>?, Signal<D3>?, Signal<D4>?, Signal<D5>?, Signal<D6>?, Signal<D7>?, Signal<D8>?, Signal<D9>?],
    computation: (value1: D1, value2?: D2, value3?: D3, value4?: D4, value5?: D5, value6?: D6, value7?: D7, value8?: D8, value9?: D9) => Promise<T>,
    defaultValue?: T) {
    const s = signal<T | undefined>(defaultValue);
    effect(() => {
        const values = <[D1, D2, D3, D4, D5, D6, D7, D8, D9]>dependencies.map(d => d?.());
        computation(...values).then(result => s.set(result));
    });
    return s.asReadonly();
}

export function multiEffect<T, D1, D2, D3, D4, D5, D6, D7, D8, D9>(
    dependencies: [Signal<D1>, Signal<D2>?, Signal<D3>?, Signal<D4>?, Signal<D5>?, Signal<D6>?, Signal<D7>?, Signal<D8>?, Signal<D9>?],
    effectFn: (value1: D1, value2?: D2, value3?: D3, value4?: D4, value5?: D5, value6?: D6, value7?: D7, value8?: D8, value9?: D9) => T,
    options?: CreateEffectOptions & { skipFirst?: boolean }) {
    let lastValues: [D1, D2, D3, D4, D5, D6, D7, D8, D9] | null = null;
    let first = options?.skipFirst;
    const effectRef = effect(() => {
        const values = <[D1, D2, D3, D4, D5, D6, D7, D8, D9]>dependencies.map(d => d?.());
        if (lastValues?.every((v, i) => v === values[i]))
            return;
        lastValues = values;
        if (first) {
            first = false;
            return;
        }
        effectFn(...values);
    }, options);
    return { effectRef, fn: () => effectFn(...<[D1, D2, D3, D4, D5, D6, D7, D8, D9]>dependencies.map(d => d?.())) };
}