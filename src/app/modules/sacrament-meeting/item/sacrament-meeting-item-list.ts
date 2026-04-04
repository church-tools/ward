import { RowCardListMulti, RowCardListMultiItem, type RowCardListMultiQuery } from '@/modules/shared/row-card-list/row-card-list-multi';
import type { Table } from '@/modules/shared/table.types';
import { Button } from '@/shared/form/button/button';
import { xcomputed } from '@/shared/utils/signal-utils';
import { Component, input } from '@angular/core';
import { UrlTree } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import type { Hymn } from './hymn/hymn';
import { HymnListRow } from './hymn/hymn-list-row';
import type { Message } from './message/message';
import { MessageListRow } from './message/message-list-row';
import { MusicalPerformance } from './musical-performance/musical-performance';
import { MusicalPerformanceListRow } from './musical-performance/musical-performance-list-row';

export type SacramentMeetingItemTableName = 'message' | 'hymn' | 'musical_performance';

@Component({
    selector: 'app-sacrament-meeting-item-list',
    template: `
        <app-row-card-list-multi
            [tableQueries]="tableQueries()"
            [editable]="true"
            [alwaysShowInsertTemplate]="true"
            [activeId]="activeItemId()"
            [getUrl]="getUrl()"
            [cardClasses]="'card canvas-card suppress-canvas-card-animation'">
            <ng-template #rowTemplate let-item>
                @if (item.table === 'message') {
                    <app-message-list-row [row]="item.row"/>
                } @else if (item.table === 'hymn') {
                    <app-hymn-list-row [row]="item.row"/>
                } @else if (item.table === 'musical_performance') {
                    <app-musical-performance-list-row [row]="item.row"/>
                }
            </ng-template>
            <ng-template #insertTemplate let-functions>
                <div class="row gap-2 full-width center-content">
                    <app-button type="secondary" size="large"
                        (onClick)="insertItem(functions.insert)">
                        {{ 'MESSAGE_PAGE.TITLE' | translate }}
                    </app-button>
                    <app-button type="secondary" size="large"
                        (onClick)="insertItem(functions.insert)">
                        {{ 'HYMN_PAGE.TITLE' | translate }}
                    </app-button>
                    <app-button type="secondary" size="large"
                        (onClick)="insertItem(functions.insert)">
                        {{ 'MUSICAL_PERFORMANCE_PAGE.SHORT_TITLE' | translate }}
                    </app-button>
                </div>
            </ng-template>
        </app-row-card-list-multi>
    `,
    imports: [TranslateModule, Button,
        RowCardListMulti,
        MessageListRow,
        HymnListRow,
        MusicalPerformanceListRow,
    ],
    host: { class: 'full-width' },
})
export class SacramentMeetingItemList {

    readonly meetingId = input.required<number>();
    readonly unit = input.required<number>();
    readonly activeItemId = input<number | null>(null);
    readonly getUrl = input<(item: RowCardListMultiItem<SacramentMeetingItemTableName> | null) => string | UrlTree>();

    protected readonly tableQueries = xcomputed([this.meetingId], meetingId => [
        {
            tableName: 'message',
            id: `sacrament_meeting_message_${meetingId}`,
            query: (table: Table<'message'>) => table.find().eq('sacrament_meeting', meetingId),
        },
        {
            tableName: 'hymn',
            id: `sacrament_meeting_hymn_${meetingId}`,
            query: (table: Table<'hymn'>) => table.find().eq('sacrament_meeting', meetingId),
        },
        {
            tableName: 'musical_performance',
            id: `sacrament_meeting_musical_performance_${meetingId}`,
            query: (table: Table<'musical_performance'>) => table.find().eq('sacrament_meeting', meetingId),
        },
    ] as readonly RowCardListMultiQuery<SacramentMeetingItemTableName>[]);

    protected async insertItem(insertFn: (item: Message.Insert | Hymn.Insert | MusicalPerformance.Insert) => Promise<void>) {
        await insertFn({ unit: this.unit(), sacrament_meeting: this.meetingId() });                
    }
}
