import { Component } from "@angular/core";
import type { TableName } from "../../shared/types";

export async function getListInsertComponent<T extends TableName>(tableName: T) {
    switch (tableName) {
        case 'agenda': return (await import('../agenda/agenda-list-insert')).AgendaListInsertComponent;
        default: throw new Error(`No list row component found for table: ${tableName}`);
    }
}
@Component({
    selector: 'app-list-insert',
    template: '',
})
export abstract class ListInsertComponent<T extends TableName> {
    
}