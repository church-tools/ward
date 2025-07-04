import { Component, input } from "@angular/core";
import type { Row, TableName } from "../../shared/types";

export async function getListRowComponent<T extends TableName>(tableName: T) {
    switch (tableName) {
        case 'agenda': return (await import('../agenda/agenda-list-row')).AgendaListRowComponent;
        case 'task': return (await import('../task/task-list-row')).TaskListRowComponent;
        case 'profile': return (await import('../profile/profile-list-row')).ProfileListRowComponent;
        default: throw new Error(`No list row component found for table: ${tableName}`);
    }
}

@Component({
    selector: 'app-list-row',
    template: '',
})
export abstract class ListRowComponent<T extends TableName> {
    
    readonly row = input.required<Row<T>>();
}