import { getRowRoute } from '@/private/private.routes';
import { DatePipe } from '@angular/common';
import { Component, inject, input } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { SundayIndex, sundayIndexToDate } from '../../shared/utils/date-utils';
import { createTranslateLocaleSignal } from '../../shared/utils/language-utils';
import { xcomputed } from '../../shared/utils/signal-utils';
import { ListRow } from '../shared/row-card-list/list-row';
import type { RowCardListMultiItem, RowCardListMultiQuery } from '../shared/row-card-list/row-card-list-multi';
import { RowCardListMulti } from '../shared/row-card-list/row-card-list-multi';
import type { Table } from '../shared/table.types';
import { HymnListRow } from './item/hymn/hymn-list-row';
import { MessageListRow } from './item/message/message-list-row';
import { MusicalPerformanceListRow } from './item/musical-performance/musical-performance-list-row';
import { SacramentMeetingViewService } from './sacrament-meeting-view.service';

type ItemTableName = 'message' | 'hymn' | 'musical_performance';

@Component({
    selector: 'app-sacrament-meeting-list-row',
    template: `
        <div class="row full-width m-4-6 row-gap-1 column-gap-4 items-center">
            <div class="column gap-1">
                <h4>
                    {{ date() | date : 'dd MMM yyyy' : undefined : locale() }}
                </h4>
                @if (row().type; as type) {
                    <span class="text-secondary">{{ meetingView.getTypeLabel(type) }}</span>
                }
            </div>
            <!-- <div class="row grow-1"> -->
                <app-row-card-list-multi
                    [tableQueries]="tableQueries()"
                    [activeId]="activeItemId()"
                    [getUrl]="getItemUrl"
                    [cardClasses]="'card canvas-card suppress-canvas-card-animation'">
                    <ng-template #rowTemplate let-item>
                        @if (item.table === 'message') {
                            <app-message-list-row [row]="item.row" narrow/>
                        } @else if (item.table === 'hymn') {
                            <app-hymn-list-row [row]="item.row" narrow/>
                        } @else if (item.table === 'musical_performance') {
                            <app-musical-performance-list-row [row]="item.row" narrow/>
                        }
                    </ng-template>
                </app-row-card-list-multi>
            <!-- </div> -->
        </div>
    `,
    imports: [TranslateModule, DatePipe, RowCardListMulti,
        MessageListRow, HymnListRow, MusicalPerformanceListRow],
})
export class SacramentMeetingListRow extends ListRow<'sacrament_meeting'> {

    protected readonly meetingView = inject(SacramentMeetingViewService);
    protected readonly translate = inject(TranslateService);
    protected readonly locale = createTranslateLocaleSignal(this.translate);

    readonly activeItemId = input<number | null>(null);
    readonly previewMode = input.required<'message' | 'hymn'>();


    protected readonly date = xcomputed([this.row],
        row => sundayIndexToDate(row.week as SundayIndex));
        
    protected readonly tableQueries = xcomputed([this.row, this.previewMode], (row, preview) => {
        switch (preview) {
            case 'message': return [
                {
                    tableName: 'message',
                    id: `sacrament_meeting_message_${row.id}`,
                    query: (table: Table<'message'>) => table.find().eq('sacrament_meeting', row.id),
                },
            ] as readonly RowCardListMultiQuery<ItemTableName>[];
            case 'hymn': return [
                {
                    tableName: 'hymn',
                    id: `sacrament_meeting_hymn_${row.id}`,
                    query: (table: Table<'hymn'>) => table.find().eq('sacrament_meeting', row.id),
                },
                {
                    tableName: 'musical_performance',
                    id: `sacrament_meeting_musical_performance_${row.id}`,
                    query: (table: Table<'musical_performance'>) => table.find().eq('sacrament_meeting', row.id),
                },
            ] as readonly RowCardListMultiQuery<ItemTableName>[];
            default: return [];
        }
    });

    protected readonly getItemUrl = (item: RowCardListMultiItem<ItemTableName> | null) => {
        if (!item)
            return '';
        return getRowRoute({ table: item.table, row: item.row as any });
    }
}
