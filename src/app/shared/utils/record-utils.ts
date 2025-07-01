

export function findRecord<T>(records: Record<string, T>, predicate: (record: T) => boolean): T | undefined {
    for (const key in records) {
        const record = records[key];
        if (predicate(record))
            return record;
    }
    return undefined;
}