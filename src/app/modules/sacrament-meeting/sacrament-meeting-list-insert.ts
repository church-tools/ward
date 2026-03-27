import { Component, inject, OnInit, signal, viewChild } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { Button } from '../../shared/form/button/button';
import WeekInput from '../../shared/form/date-time/week-input';
import { Select } from '../../shared/form/select/select';
import { SupabaseService } from '../../shared/service/supabase.service';
import { getSundayIndexInMonth, getUpcomingSundayIndex, SundayIndex } from '../../shared/utils/date-utils';
import { Profile } from '../profile/profile';
import { ListInsert } from '../shared/row-card-list/list-insert';
import { SacramentMeeting } from './sacrament-meeting';
import { SacramentMeetingViewService } from './sacrament-meeting-view.service';

@Component({
    selector: 'app-sacrament-meeting-list-insert',
    template: `
        <div class="row gap-1 full-width">
            <app-week-input #week class="width-24"
                [weekday]="0"
                [value]="defaultWeek()"
                (ngModelChange)="updateValidity()"/>
            <app-select #type class="grow-1"
                placeholder="{{ 'SACRAMENT_MEETING_PAGE.TYPE' | translate }}"
                [options]="meetingView.typeOptions" translateOptions
                [value]="defaultType()"
                (ngModelChange)="updateValidity()"/>
            
            <app-button (onClick)="submit($event)" class="icon-only"
                [icon]="isValid() ? 'save' : 'dismiss'"
                [type]="isValid() ? 'primary' : 'subtle'"/>
        </div>
    `,
    imports: [TranslateModule, WeekInput, Select, Button],
})
export class SacramentMeetingListInsert extends ListInsert<'sacrament_meeting'> implements OnInit {

    protected readonly meetingView = inject(SacramentMeetingViewService);
    private readonly supabase = inject(SupabaseService);

    private readonly weekView = viewChild.required<WeekInput>('week');
    private readonly typeView = viewChild.required<Select<SacramentMeeting.Type>>('type');

    protected readonly defaultWeek = signal(getUpcomingSundayIndex());
    protected readonly defaultType = signal<SacramentMeeting.Type | null>(null);
    protected readonly isValid = signal(true);

    async ngOnInit() {
        const previousWeek = await this.getPreviousWeek();
        if (previousWeek) {
            const week = previousWeek + 1 as SundayIndex;
            this.defaultWeek.set(week);
            const weekInMonth = getSundayIndexInMonth(week);
            this.defaultType.set(weekInMonth === 1 ? 'fast_and_testimony' : null);
        }
    }

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
        const week = this.weekView().value();
        if (!Number.isInteger(week) || (week ?? 0) < 1) return null;
        return week;
    }

    private async getPreviousWeek(): Promise<SundayIndex | null> {
        const weekIndexes = await this.supabase.sync.from('sacrament_meeting').readAll().getKeys() as SundayIndex[];
        if (!weekIndexes.length) return null;
        return Math.max(...weekIndexes) as SundayIndex;
    }
}
