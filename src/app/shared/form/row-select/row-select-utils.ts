import { Injector } from '@angular/core';
import { getViewService } from '../../../modules/shared/view.service';
import type { Row, Table, TableName, TableQuery } from '../../../modules/shared/table.types';

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