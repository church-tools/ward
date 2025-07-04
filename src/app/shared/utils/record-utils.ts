

export function findRecord<T>(records: Record<string, T>, predicate: (record: T) => boolean): T | undefined {
    for (const key in records) {
        const record = records[key];
        if (predicate(record))
            return record;
    }
    return undefined;
}

export function filterRecords<T>(records: Record<string, T>, predicate: (record: T) => boolean): Record<string, T> {
    const filtered: Record<string, T> = {};
    const keys = Object.keys(records);
    for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        const record = records[key];
        if (predicate(record))
            filtered[key] = record;
    }
    return filtered;
}

export function hasRecords<T>(records: Record<string, T>): boolean {
    for (const key in records)
        return true;
    return false;
}
