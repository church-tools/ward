
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
