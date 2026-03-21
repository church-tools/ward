import { DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { SundayIndex, sundayIndexToDate } from '../../shared/utils/date-utils';
import { createTranslateLocaleSignal } from '../../shared/utils/language-utils';
import { xcomputed } from '../../shared/utils/signal-utils';
import { ListRow } from '../shared/row-card-list/list-row';
import { SacramentMeetingViewService } from './sacrament-meeting-view.service';

@Component({
    selector: 'app-sacrament-meeting-list-row',
    template: `
        <div class="column full-width m-6-8 gap-1">
            <h4 class="grow-1 overflow-ellipsis">
                {{ date() | date : 'dd MMM yyyy' : undefined : locale() }}
            </h4>
            @let type = row().type;
            @if (type) {
                <span class="text-secondary">{{ meetingView.getTypeLabel(type) }}</span>
            }
        </div>
    `,
    imports: [TranslateModule, DatePipe],
})
export class SacramentMeetingListRow extends ListRow<'sacrament_meeting'> {

    protected readonly meetingView = inject(SacramentMeetingViewService);
    protected readonly translate = inject(TranslateService);
    protected readonly locale = createTranslateLocaleSignal(this.translate);

    protected readonly date = xcomputed([this.row],
        row => sundayIndexToDate(row.week as SundayIndex));
}
