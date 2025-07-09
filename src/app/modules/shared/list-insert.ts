import { Component, inject, input } from "@angular/core";
import { MaybeAsync } from "@angular/router";
import type { Insert, TableName } from "../../shared/types";
import { Profile } from "../profile/profile";
import { ProfileService } from "../profile/profile.service";

export async function getListInsertComponent<T extends TableName>(tableName: T) {
    switch (tableName) {
        case 'agenda': return (await import('../agenda/agenda-list-insert')).AgendaListInsertComponent;
        case 'task': return (await import('../task/task-list-insert')).TaskListInsertComponent;
        default: throw new Error(`No list row component found for table: ${tableName}`);
    }
}
@Component({
    selector: 'app-list-insert',
    template: '',
})
export abstract class ListInsertComponent<T extends TableName> {
    
    private readonly profileService = inject(ProfileService);
    
    readonly insert = input.required<(item: Insert<T>) => MaybeAsync<void>>();
    readonly cancel = input.required<() => void>();
    readonly prepareInsert = input<(row: Insert<T>) => MaybeAsync<void>>();

    protected async submit() {
        const profile = await this.profileService.own.get();
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