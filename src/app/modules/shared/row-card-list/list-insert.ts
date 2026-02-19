import { Component, inject, input, type Type } from "@angular/core";
import type { PromiseOrValue } from "../../../shared/types";
import { Profile } from "../../profile/profile";
import { ProfileService } from "../../profile/profile.service";
import { Insert, TableName } from "../table.types";

export function getListInsertComponent<T extends TableName>(tableName: T) {
    return getComponent(tableName) as Promise<Type<ListInsertComponent<T>>>;
}

async function getComponent<T extends TableName>(tableName: T) {
    switch (tableName) {
        case "agenda": return (await import('../../agenda/agenda-list-insert')).AgendaListInsertComponent;
        case "agenda_section": return (await import('../../agenda/section/agenda-section-list-insert')).AgendaSectionListInsertComponent;
        case "agenda_item": return (await import('../../item/agenda-item-list-insert')).AgendaItemListInsertComponent;
        case "member": return (await import('../../member/member-list-insert')).MemberListInsertComponent;
        case "calling": return (await import('../../calling/calling-list-insert')).CallingListInsertComponent;
        case "organization": return (await import('../../organization/organization-list-insert')).OrganizationListInsertComponent;
        case "profile": return (await import('../../profile/profile-list-insert')).ProfileListInsertComponent;
    }
    throw new Error(`No list insert component found for table: ${tableName}`);
}

@Component({
    selector: 'app-list-insert',
    template: '',
})
export abstract class ListInsertComponent<T extends TableName, C = unknown> {
    
    private readonly profileService = inject(ProfileService);
    
    readonly insert = input.required<(item: Insert<T>) => PromiseOrValue<void>>();
    readonly cancel = input.required<() => void>();
    readonly prepareInsert = input<(row: Insert<T>) => PromiseOrValue<void>>();
    readonly context = input<C>();

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