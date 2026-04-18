import { getRowRoute } from '@/private/private.routes';
import { LanguageService } from '@/shared/language/language.service';
import { DatePipe } from '@angular/common';
import { Component, inject, input } from '@angular/core';
import { SundayIndex, sundayIndexToDate } from '../../shared/utils/date-utils';
import { xcomputed } from '../../shared/utils/signal-utils';
import { ListRow } from '../shared/row-card-list/list-row';
import type { RowCardListMultiItem, RowCardListMultiQuery } from '../shared/row-card-list/row-card-list-multi';
import { RowCardListMulti } from '../shared/row-card-list/row-card-list-multi';
import type { Table } from '../shared/table.types';
import { HymnListRow } from './item/hymn/hymn-list-row';
import { MessageListInsert } from "./item/message/message-list-insert";
import { MessageListRow } from './item/message/message-list-row';
import { MusicalPerformanceListRow } from './item/musical-performance/musical-performance-list-row';
import { SacramentMeetingViewService } from './sacrament-meeting-view.service';

type ItemTableName = 'message' | 'hymn' | 'musical_performance';

@Component({
    selector: 'app-sacrament-meeting-list-row',
    template: `
        <div class="row m-4-6 row-gap-1 column-gap-4 items-center">
            <div class="column gap-1">
                <h4>
                    {{ date() | date : 'dd MMM yyyy' : undefined : language.locale() }}
                </h4>
                @if (row().type; as type) {
                    <span class="text-secondary">{{ meetingView.getTypeLabel(type) }}</span>
                }
            </div>
            <app-row-card-list-multi class="grow-1"
                [tableQueries]="tableQueries()"
                [activeId]="activeItemId()"
                [getUrl]="getItemUrl"
                [cardClasses]="'card canvas-card suppress-canvas-card-animation'"
                [dense]="true"
                [gap]="1"
                [nudgeFactor]="0.5"
                mutable
                [editable]="previewMode() !== 'none'">
                <ng-template #rowTemplate let-item>
                    @if (item.table === 'message') {
                        <app-message-list-row [row]="item.row" dense/>
                    } @else if (item.table === 'hymn') {
                        <app-hymn-list-row [row]="item.row" dense/>
                    } @else if (item.table === 'musical_performance') {
                        <app-musical-performance-list-row [row]="item.row" dense/>
                    }
                </ng-template>
                <ng-template #insertTemplate let-functions>
                    <div class="row gap-2 full-width center-content">
                        @if (previewMode() === 'message') {
                            <app-message-list-insert
                                [insert]="functions.insert"
                                [cancel]="functions.cancel"/>
                        } @else {
                            <div></div>
                        }
                    </div>
                </ng-template>
            </app-row-card-list-multi>
        </div>
    `,
    imports: [DatePipe, RowCardListMulti,
        MessageListInsert, MessageListRow, HymnListRow, MusicalPerformanceListRow],
})
export class SacramentMeetingListRow extends ListRow<'sacrament_meeting'> {

    protected readonly meetingView = inject(SacramentMeetingViewService);
    protected readonly language = inject(LanguageService);

    readonly activeItemId = input<number | null>(null);
    readonly previewMode = input.required<'message' | 'hymn' | 'none'>();

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
            default: return [
                {
                    tableName: 'message',
                    id: `sacrament_meeting_none_${row.id}`,
                    query: (table: Table<'message'>) => table.find().eq('id', -1),
                }
            ] as readonly RowCardListMultiQuery<ItemTableName>[];
        }
    });

    protected readonly getItemUrl = (item: RowCardListMultiItem<ItemTableName> | null) => {
        return item
            ? getRowRoute({ table: item.table, row: item.row as any })
            : getRowRoute({ table: 'sacrament_meeting', row: this.row() });
    }

}
