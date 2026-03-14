import { Component, inject, input } from "@angular/core";
import type { PromiseOrValue } from "../../../shared/types";
import type { Profile } from "../../profile/profile";
import { ProfileService } from "../../profile/profile.service";
import type { Insert, TableName } from "../table.types";

@Component({
    selector: 'app-list-insert',
    template: '',
})
export abstract class ListInsert<T extends TableName, C = unknown> {
    
    private readonly profileService = inject(ProfileService);
    
    readonly insert = input.required<(item: Insert<T>) => PromiseOrValue<void>>();
    readonly cancel = input.required<() => void>();
    readonly prepareInsert = input<(row: Insert<T>) => PromiseOrValue<void>>();
    readonly context = input<C>();

    protected async submit(event?: UIEvent | null) {
        const profile = await this.profileService.own.asPromise();
        const rowInfo = this.getRowInfo(profile);
        if (!rowInfo) {
            event?.stopPropagation();
            this.cancel()();
            return;
        }
        await this.prepareInsert()?.(rowInfo);
        await this.insert()(rowInfo);
    }

    protected abstract getRowInfo(profile: Profile.Row): Insert<T> | undefined;
}