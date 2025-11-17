import { Component, input } from "@angular/core";
import { PageComponent } from "../../shared/page/page";
import { Row, TableName } from "./table.types";

export async function getListRowComponent<T extends TableName>(tableName: T) {
    switch (tableName) {
        case 'agenda': return (await import('../agenda/agenda-list-row')).AgendaListRowComponent;
        case 'agenda_section': return (await import('../agenda/section/agenda-section-list-row')).AgendaSectionListRowComponent;
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
    readonly onRemove = input<(row: Row<T>) => Promise<void>>();
    readonly page = input<PageComponent>();
}
