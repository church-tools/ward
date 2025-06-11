

export function firstFreeIndex<T>(dict: Record<number, T>, first = 1): number {
    let index = first;
    while (index in dict) index++;
    return index;
}