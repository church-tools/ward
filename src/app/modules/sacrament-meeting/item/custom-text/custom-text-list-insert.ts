import { Profile } from '@/modules/profile/profile';
import { ListInsert } from '@/modules/shared/row-card-list/list-insert';
import { CustomRowSelect } from "@/shared/form/row-select/custom-row-select";
import { TextInput } from "@/shared/form/text/text-input";
import { Component, input, viewChild } from '@angular/core';
import { CustomText } from './custom-text';

@Component({
    selector: 'app-custom-text-list-insert',
    template: `
        <app-text-input #content class="full-width"/>
        <app-custom-row-select class="full-width" #speaker table="member" (onBlur)="submit()"/>
    `,
    host: {
        class: 'full-width',
    },
    imports: [CustomRowSelect, TextInput],
})
export class CustomTextListInsert extends ListInsert<'custom_text'> {

    private readonly contentView = viewChild.required<TextInput>('content');

    readonly sacramentMeetingId = input<number>();

    protected override getRowInfo(profile: Profile.Row) {
        const content = this.contentView().getValue()?.trim();
        if (!content) return;
        return {
            content,
            position: 0,
            unit: profile.unit,
            sacrament_meeting: this.sacramentMeetingId(),
            type: 'custom_text',
        } as CustomText.Insert;
    }

}