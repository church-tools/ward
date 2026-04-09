import { Profile } from '@/modules/profile/profile';
import { ListInsert } from '@/modules/shared/row-card-list/list-insert';
import { CustomRowSelect } from "@/shared/form/row-select/custom-row-select";
import { Component, input, viewChild } from '@angular/core';
import { Message } from './message';

@Component({
    selector: 'app-message-list-insert',
    template: `
        <app-custom-row-select class="full-width" #speaker table="member" (onBlur)="submit()"/>
    `,
    imports: [CustomRowSelect],
})
export class MessageListInsert extends ListInsert<'message'> {

    private readonly speakerView = viewChild.required<CustomRowSelect<'member'>>('speaker');

    readonly sacramentMeetingId = input<number>();

    protected override getRowInfo(profile: Profile.Row) {
        const speaker = this.speakerView().getValue();
        if (!speaker) return;
        return { speaker, unit: profile.unit, sacrament_meeting: this.sacramentMeetingId() } as Message.Insert;
    }

}