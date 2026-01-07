
export type SortingFn<T> = (a: T, b: T) => number;
export type WithSimilarity<T> = T & { similarity: number };
export type WithDistance<T> = T & { distance: number };

export function range(start: number, end: number, step = 1): number[] {
    return Array.from({ length: Math.ceil((end - start + 1) / step) }, (_, i) => start + i * step);
}

export function groupByKey<T>(array: T[], key: keyof T): { [group: string]: T[] } {
    return array.reduce((result, item) => {
        const groupKey = String(item[key]);
        if (!result[groupKey]) 
            result[groupKey] = [];
        result[groupKey].push(item);
        return result;
    }, {} as { [key: string]: T[] });
}

export function groupBy<T>(array: T[], getGroup: (item: T) => string | number): { [group: string]: T[] } {
    return array.reduce((result, item) => {
        const groupKey = getGroup(item);
        if (!result[groupKey]) 
            result[groupKey] = [];
        result[groupKey].push(item);
        return result;
    }, {} as { [key: string]: T[] });
}

export function sortInto<T>(value: T, sortedArray: T[], compare: SortingFn<T> = (a, b) => a < b ? -1 : a > b ? 1 : 0) {
    let index = 0, high = sortedArray.length;
    while (index < high) {
        var mid = (index + high) >>> 1;
        if (compare(sortedArray[mid], value) < 0) index = mid + 1;
        else high = mid;
    }
    while (index < sortedArray.length && compare(value, sortedArray[index]) === 0)
        index++;
    sortedArray.splice(index, 0, value);
}

export function getHighest<T>(array: T[], getValue: (item: T, i: number) => number, limit?: number): WithSimilarity<T>[] {
    const highest: WithSimilarity<T>[] = [];
    for (let i = 0; i < array.length; i++) {
        const elem = array[i] as WithSimilarity<T>;
        elem.similarity = getValue(elem, i);
        if (limit && highest.length === limit) {
            if (elem.similarity <= highest.at(-1)!.similarity)
                continue;
            highest.pop();
        }
        sortInto(elem, highest, (a, b) => b.similarity - a.similarity);
    }
    return highest;
}

export function getLowest<T>(array: T[], getValue: (item: T, i: number) => number, limit?: number): WithDistance<T>[] {
    const lowest: WithDistance<T>[] = [];
    for (let i = 0; i < array.length; i++) {
        const elem = array[i] as WithDistance<T>;
        elem.distance = getValue(elem, i);
        if (limit && lowest.length === limit) {
            if (elem.distance >= lowest.at(-1)!.distance)
                continue;
            lowest.pop();
        }
        sortInto(elem, lowest, (a, b) => a.distance - b.distance);
    }
    return lowest;
}


export function mapToSubObjects<T>(array: T[], ...keys: (keyof T)[]): Partial<T>[] {
    return array.map(item => {
        const subObject: Partial<T> = {};
        for (const key of keys)
            subObject[key] = item[key];
        return subObject;
    });
}

export function assureArray<T>(value: T | T[]): T[] {
    if (value == null) return [];
    return Array.isArray(value) ? value : [value];
}