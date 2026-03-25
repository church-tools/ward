import { DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { SacramentMeetingViewService } from '../../../modules/sacrament-meeting/sacrament-meeting-view.service';
import { CustomRowSelect } from '../../../shared/form/row-select/custom-row-select';
import { Select } from '../../../shared/form/select/select';
import { TextInput } from '../../../shared/form/text/text-input';
import { SundayIndex, sundayIndexToDate } from '../../../shared/utils/date-utils';
import { createTranslateLocaleSignal } from '../../../shared/utils/language-utils';
import { xcomputed } from '../../../shared/utils/signal-utils';
import { SyncedFieldDirective } from '../../../shared/utils/supa-sync/synced-field.directive';
import { RowHistory } from '../../shared/row-history';
import { RowPage } from '../../shared/row-page';

@Component({
    selector: 'app-sacrament-meeting-page',
    template: `
        <h2>
            @if (meetingDate(); as date) {
                {{ date | date : 'dd MMM yyyy' : undefined : locale() }}
            } @else {
                {{ title() }}
            }
        </h2>
        <div class="column-grid">
            <app-select class="col-md-8"
                [syncedRow]="syncedRow" column="type"
                [options]="meetingView.typeOptions" translateOptions
                label="{{ 'SACRAMENT_MEETING_PAGE.TYPE' | translate }}"/>

            <app-custom-row-select class="col-md-6"
                [syncedRow]="syncedRow" column="opening_prayer"
                table="member"
                label="{{ 'SACRAMENT_MEETING_PAGE.OPENING_PRAYER' | translate }}"/>

            <app-custom-row-select class="col-md-6"
                [syncedRow]="syncedRow" column="closing_prayer"
                table="member"
                label="{{ 'SACRAMENT_MEETING_PAGE.CLOSING_PRAYER' | translate }}"/>

            <app-text-input class="col-12"
                [syncedRow]="syncedRow" column="classes"
                label="{{ 'SACRAMENT_MEETING_PAGE.CLASSES' | translate }}"/>
        </div>

        <app-row-history [row]="syncedRow.value()" class="mt-auto"/>
    `,
    imports: [TranslateModule, SyncedFieldDirective, Select,
        CustomRowSelect, TextInput, DatePipe, RowHistory],
    host: { class: 'page narrow full-height' },
})
export class SacramentMeetingPage extends RowPage<'sacrament_meeting'> {

    protected readonly tableName = 'sacrament_meeting';
    protected readonly meetingView = inject(SacramentMeetingViewService);
    protected readonly translate = inject(TranslateService);

    protected readonly locale = createTranslateLocaleSignal(this.translate);

    protected readonly meetingDate = xcomputed([this.syncedRow.value], row =>
        row ? sundayIndexToDate(row.week as SundayIndex) : null);
}
