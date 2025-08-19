import { Component, inject, input } from "@angular/core";
import type { PromiseOrValue } from "../../shared/types";
import { Profile } from "../profile/profile";
import { ProfileService } from "../profile/profile.service";
import { Insert, TableName } from "./table.types";

export async function getListInsertComponent<T extends TableName>(tableName: T) {
    switch (tableName) {
        case 'agenda': return (await import('../agenda/agenda-list-insert')).AgendaListInsertComponent;
        case 'agenda_section': return (await import('../agenda/section/agenda-section-list-insert')).AgendaSectionListInsertComponent;
        case 'task': return (await import('../task/task-list-insert')).TaskListInsertComponent;
        default: throw new Error(`No list insert component found for table: ${tableName}`);
    }
}
@Component({
    selector: 'app-list-insert',
    template: '',
})
export abstract class ListInsertComponent<T extends TableName> {
    
    private readonly profileService = inject(ProfileService);
    
    readonly insert = input.required<(item: Insert<T>) => PromiseOrValue<void>>();
    readonly cancel = input.required<() => void>();
    readonly prepareInsert = input<(row: Insert<T>) => PromiseOrValue<void>>();

    protected async submit() {
        const profile = await this.profileService.own.asPromise();
        let rowInfo = this.getRowInfo(profile);
        if (!rowInfo) {
            this.cancel()();
            return;
        }
        await this.prepareInsert()?.(rowInfo);
        await this.insert()(rowInfo);
    }

    protected abstract getRowInfo(profile: Profile.Row): Insert<T> | undefined;
}