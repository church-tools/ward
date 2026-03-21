import { Component, inject, signal, viewChild } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import Button from '../../shared/form/button/button';
import { Select } from '../../shared/form/select/select';
import { TextInput } from '../../shared/form/text/text-input';
import { getUpcomingSundayIndex } from '../../shared/utils/date-utils';
import { Profile } from '../profile/profile';
import { ListInsert } from '../shared/row-card-list/list-insert';
import { SacramentMeeting } from './sacrament-meeting';
import { SacramentMeetingViewService } from './sacrament-meeting-view.service';

@Component({
    selector: 'app-sacrament-meeting-list-insert',
    template: `
        <div class="row gap-1 full-width">
            <app-text-input #week class="width-24"
                [value]="defaultWeek"
                placeholder="{{ 'SACRAMENT_MEETING_PAGE.WEEK_FIELD' | translate }}"
                (ngModelChange)="updateValidity()"/>
            <app-select #type class="grow-1"
                placeholder="{{ 'SACRAMENT_MEETING_PAGE.TYPE' | translate }}"
                [options]="meetingView.typeOptions" translateOptions
                (ngModelChange)="updateValidity()"/>
            <app-button (onClick)="submit($event)" class="icon-only"
                [icon]="isValid() ? 'save' : 'dismiss'"
                [type]="isValid() ? 'primary' : 'subtle'"/>
        </div>
    `,
    imports: [TranslateModule, TextInput, Select, Button],
})
export class SacramentMeetingListInsert extends ListInsert<'sacrament_meeting'> {

    protected readonly meetingView = inject(SacramentMeetingViewService);

    private readonly weekView = viewChild.required<TextInput>('week');
    private readonly typeView = viewChild.required<Select<SacramentMeeting.Type>>('type');

    protected readonly defaultWeek = String(getUpcomingSundayIndex());
    protected readonly isValid = signal(true);

    protected updateValidity() {
        this.isValid.set(this.getWeekValue() !== null);
    }

    protected override getRowInfo(profile: Profile.Row) {
        const week = this.getWeekValue();
        if (week === null) return;
        const type = this.typeView().getValue();
        return <SacramentMeeting.Insert>{
            week,
            unit: profile.unit,
            type: type ?? null,
        };
    }

    private getWeekValue(): number | null {
        const rawValue = this.weekView().getValue();
        if (!rawValue) return null;
        const week = Number.parseInt(rawValue, 10);
        if (!Number.isInteger(week) || week < 1) return null;
        return week;
    }
}
