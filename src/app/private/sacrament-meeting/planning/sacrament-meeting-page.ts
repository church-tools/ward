import { SacramentMeetingItemList, SacramentMeetingItemTableName } from '@/modules/sacrament-meeting/item/sacrament-meeting-item-list';
import { SacramentMeetingViewService } from '@/modules/sacrament-meeting/sacrament-meeting-view.service';
import { RowCardListMultiItem } from '@/modules/shared/row-card-list/row-card-list-multi';
import { CustomRowSelect } from '@/shared/form/row-select/custom-row-select';
import { MultiSelect } from '@/shared/form/select/multi-select';
import { Select } from '@/shared/form/select/select';
import { SundayIndex, sundayIndexToDate } from '@/shared/utils/date-utils';
import { createTranslateLocaleSignal } from '@/shared/utils/language-utils';
import { xcomputed } from '@/shared/utils/signal-utils';
import { SyncedFieldDirective } from '@/shared/utils/supa-sync/synced-field.directive';
import { DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
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
            @if (syncedRow.value(); as row) {
                <div class="col-12">
                    <app-sacrament-meeting-item-list
                        [meetingId]="row.id"
                        [unit]="row.unit"
                        [activeItemId]="activeItemId()"
                        [getUrl]="itemPopoverUrl"/>
                </div>
            }
            <app-custom-row-select class="col-md-6"
                [syncedRow]="syncedRow" column="closing_prayer"
                table="member"
                label="{{ 'SACRAMENT_MEETING_PAGE.CLOSING_PRAYER' | translate }}"/>

            <app-multi-select class="col-12"
                [syncedRow]="syncedRow" column="classes"
                [options]="meetingView.classOptions"
                [optionValuesByValue]="meetingView.classOptionsByClass"
                [allowCustomText]="true"
                [customValueExclusive]="true"
                translateOptions
                label="{{ 'SACRAMENT_MEETING_PAGE.CLASSES' | translate }}"/>
        </div>


        <app-row-history [row]="syncedRow.value()" class="mt-auto"/>
    `,
    imports: [TranslateModule, SyncedFieldDirective, Select,
        MultiSelect, CustomRowSelect, DatePipe, RowHistory, SacramentMeetingItemList],
    host: { class: 'page narrow full-height' },
})
export class SacramentMeetingPage extends RowPage<'sacrament_meeting'> {

    protected readonly tableName = 'sacrament_meeting';
    protected readonly meetingView = inject(SacramentMeetingViewService);
    protected readonly translate = inject(TranslateService);
    private readonly popoverRouteSubscription: Subscription;

    protected readonly locale = createTranslateLocaleSignal(this.translate);

    protected readonly meetingDate = xcomputed([this.syncedRow.value], row =>
        row ? sundayIndexToDate(row.week as SundayIndex) : null);

    protected readonly activeItemId = xcomputed([this.popoverService.rowPopoverTarget], target => {
        if (!target)
            return null;
        switch (target.tableName) {
            case 'message':
            case 'hymn':
            case 'musical_performance':
                return target.id;
            default:
                return null;
        }
    });

    constructor() {
        super();
        this.popoverRouteSubscription = this.popoverService.bindRowPopoverRoute(this.route);
    }

    override ngOnDestroy() {
        this.popoverRouteSubscription.unsubscribe();
        super.ngOnDestroy();
    }

    protected readonly itemPopoverUrl = (item: RowCardListMultiItem<SacramentMeetingItemTableName> | null) => {
        if (!item)
            return this.popoverService.getRowPopoverUrl(this.route, null);
        return this.popoverService.getRowPopoverUrl(this.route, item.table, item.row.id);
    }
}
