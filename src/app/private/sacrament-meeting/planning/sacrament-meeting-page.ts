import type { Hymn } from '@/modules/sacrament-meeting/item/hymn/hymn';
import { HymnListRow } from '@/modules/sacrament-meeting/item/hymn/hymn-list-row';
import type { Message } from '@/modules/sacrament-meeting/item/message/message';
import { MessageListRow } from '@/modules/sacrament-meeting/item/message/message-list-row';
import type { MusicalPerformance } from '@/modules/sacrament-meeting/item/musical-performance/musical-performance';
import { MusicalPerformanceListRow } from '@/modules/sacrament-meeting/item/musical-performance/musical-performance-list-row';
import { SacramentMeetingViewService } from '@/modules/sacrament-meeting/sacrament-meeting-view.service';
import { RowCardListMulti, RowCardListMultiItem, type RowCardListMultiQuery } from '@/modules/shared/row-card-list/row-card-list-multi';
import type { Table } from '@/modules/shared/table.types';
import { Button } from '@/shared/form/button/button';
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

type ItemTableName = 'message' | 'hymn' | 'musical_performance';
type ItemInsert = Message.Insert | Hymn.Insert | MusicalPerformance.Insert;

@Component({
    selector: 'app-sacrament-meeting-page',
    templateUrl: './sacrament-meeting-page.html',
    imports: [TranslateModule, SyncedFieldDirective, Select,
        MessageListRow, HymnListRow, MusicalPerformanceListRow,
        MultiSelect, CustomRowSelect, DatePipe, RowHistory, RowCardListMulti, Button],
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

    protected readonly getItemPopoverUrl = (item: RowCardListMultiItem<ItemTableName> | null) => {
        if (!item)
            return this.popoverService.getRowPopoverUrl(this.route, null);
        return this.popoverService.getRowPopoverUrl(this.route, item.table, item.row.id);
    }
    
    protected readonly tableQueries = xcomputed([this.rowId], rowId => [
        {
            tableName: 'message',
            id: `sacrament_meeting_message_${rowId}`,
            query: (table: Table<'message'>) => table.find().eq('sacrament_meeting', rowId),
        },
        {
            tableName: 'hymn',
            id: `sacrament_meeting_hymn_${rowId}`,
            query: (table: Table<'hymn'>) => table.find().eq('sacrament_meeting', rowId),
        },
        {
            tableName: 'musical_performance',
            id: `sacrament_meeting_musical_performance_${rowId}`,
            query: (table: Table<'musical_performance'>) => table.find().eq('sacrament_meeting', rowId),
        },
    ] as readonly RowCardListMultiQuery<ItemTableName>[]);
    
    protected async insertItem(insertFn: (item: ItemInsert) => Promise<void>) {
        const row = this.syncedRow.value();
        if (!row) return;
        await insertFn({ unit: row.unit, sacrament_meeting: this.rowId() } as ItemInsert);                
    }
    
}
