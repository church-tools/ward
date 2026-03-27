import type { Row, Table, TableName, TableQuery } from '@/modules/shared/table.types';
import { getViewService } from '@/modules/shared/view.service';
import { Injector } from '@angular/core';

export function resolveRowQuery<T extends TableName>(
    table: Table<T>,
    getQuery: ((table: Table<T>) => TableQuery<T, Row<T>[]>) | null,
) {
    return getQuery?.(table) ?? table.readAll();
}

export async function getRowViewToString<T extends TableName>(injector: Injector, tableName: T) {
    const viewService = await getViewService(injector, tableName);
    return viewService.toString;
}

export async function getCachedRowViewToString<T extends TableName>(
    cache: { value: ((row: Row<T>) => string) | null },
    injector: Injector,
    tableName: T,
) {
    if (!cache.value)
        cache.value = await getRowViewToString(injector, tableName);
    return cache.value;
}