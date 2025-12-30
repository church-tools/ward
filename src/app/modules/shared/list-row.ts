import { Component, input, Type } from "@angular/core";
import { PageComponent } from "../../shared/page/page";
import { Row, TableName } from "./table.types";

const rowComponentLoaders = {
    agenda: async () => (await import('../agenda/agenda-list-row')).AgendaListRowComponent,
    agenda_section: async () => (await import('../agenda/section/agenda-section-list-row')).AgendaSectionListRowComponent,
    task: async () => (await import('../task/task-list-row')).TaskListRowComponent,
    profile: async () => (await import('../profile/profile-list-row')).ProfileListRowComponent,
    member: async () => (await import('../member/member-list-row')).MemberListRowComponent,
} as const;

export function getListRowComponent<T extends TableName>(tableName: T) {
    const loader = rowComponentLoaders[tableName as keyof typeof rowComponentLoaders];
    if (!loader)
        throw new Error(`No list row component found for table: ${tableName}`);
    return loader() as Promise<Type<ListRowComponent<T>>>;
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
