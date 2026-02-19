import { Component, input, Type } from "@angular/core";
import { PageComponent } from "../../../shared/page/page";
import { Row, TableName } from "../table.types";

export function getListRowComponent<T extends TableName>(tableName: T) {
    return getComponent(tableName) as Promise<Type<ListRowComponent<T>>>;
}
    
async function getComponent<T extends TableName>(tableName: T) {
    switch (tableName) {
        case "agenda": return (await import('../../agenda/agenda-list-row')).AgendaListRowComponent;
        case "agenda_section": return (await import('../../agenda/section/agenda-section-list-row')).AgendaSectionListRowComponent;
        case "agenda_item": return (await import('../../item/agenda-item-list-row')).AgendaItemListRowComponent;
        case "profile": return (await import('../../profile/profile-list-row')).ProfileListRowComponent;
        case "member": return (await import('../../member/member-list-row')).MemberListRowComponent;
        case "organization": return (await import('../../organization/organization-list-row')).OrganizationListRowComponent;
    }
    throw new Error(`No list row component found for table: ${tableName}`);
}

@Component({
    selector: 'app-list-row',
    template: '',
    host: { 'class': 'full-width' }
})
export abstract class ListRowComponent<T extends TableName> {
    
    readonly row = input.required<Row<T>>();
    readonly onRemove = input<(row: Row<T>) => Promise<void>>();
    readonly page = input<PageComponent>();
}
