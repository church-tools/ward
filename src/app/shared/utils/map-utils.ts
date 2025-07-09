
export function filterMap<K, V>(map: Map<K, V>, filter: (value: V, key: K) => boolean): Map<K, V> {
    const filteredMap = new Map<K, V>();
    for (const [key, value] of map.entries())
        if (filter(value, key))
            filteredMap.set(key, value);
    return filteredMap;
}