import { Component, inject, input, type Type } from "@angular/core";
import type { PromiseOrValue } from "../../shared/types";
import { Profile } from "../profile/profile";
import { ProfileService } from "../profile/profile.service";
import { Insert, TableName } from "./table.types";

type ListInsertCtor<T extends TableName> = Type<ListInsertComponent<T>>;

const listInsertComponentLoaders = {
    agenda: async () => (await import('../agenda/agenda-list-insert')).AgendaListInsertComponent,
    agenda_section: async () => (await import('../agenda/section/agenda-section-list-insert')).AgendaSectionListInsertComponent,
    agenda_item: async () => (await import('../item/agenda-item-list-insert')).AgendaItemListInsertComponent,
    member: async () => (await import('../member/member-list-insert')).MemberListInsertComponent,
    calling: async () => (await import('../calling/calling-list-insert')).CallingListInsertComponent,
    profile: async () => (await import('../profile/profile-list-insert')).ProfileListInsertComponent,
} as const;

type ListInsertLoaders = typeof listInsertComponentLoaders;

export type ListInsertComponentType<T extends TableName> = ListInsertCtor<T>;

export function getListInsertComponent<T extends TableName>(tableName: T) {
    const loader = listInsertComponentLoaders[tableName as keyof ListInsertLoaders];
    if (!loader)
        throw new Error(`No list insert component found for table: ${tableName}`);
    return loader() as Promise<ListInsertComponentType<T>>;
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