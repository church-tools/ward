import { getRowRoute } from '@/private/private.routes';
import { LanguageService } from '@/shared/language/language.service';
import { SupabaseService } from '@/shared/service/supabase.service';
import { DatePipe } from '@angular/common';
import { Component, inject, input } from '@angular/core';
import { SundayIndex, sundayIndexToDate } from '../../shared/utils/date-utils';
import { xcomputed } from '../../shared/utils/signal-utils';
import { ListRow } from '../shared/row-card-list/list-row';
import type { RowCardListMultiInsert, RowCardListMultiItem, RowCardListMultiQuery } from '../shared/row-card-list/row-card-list-multi';
import { RowCardListMulti } from '../shared/row-card-list/row-card-list-multi';
import type { Table } from '../shared/table.types';
import { FixedHymnCard } from './fixed-hymn-card';
import { HymnListRow } from './item/hymn/hymn-list-row';
import { MessageListInsert } from "./item/message/message-list-insert";
import { MessageListRow } from './item/message/message-list-row';
import { MusicalPerformanceListRow } from './item/musical-performance/musical-performance-list-row';
import { getSmartSacramentMeetingItemPosition, SacramentMeetingItemTableName } from './item/sacrament-meeting-item-utils';
import { SacramentMeetingViewService } from './sacrament-meeting-view.service';

@Component({
    selector: 'app-sacrament-meeting-list-row',
    templateUrl: './sacrament-meeting-list-row.html',
    imports: [DatePipe, RowCardListMulti,
        MessageListInsert, MessageListRow, HymnListRow,
        MusicalPerformanceListRow, FixedHymnCard],
})
export class SacramentMeetingListRow extends ListRow<'sacrament_meeting'> {

    private readonly supabase = inject(SupabaseService);
    protected readonly meetingView = inject(SacramentMeetingViewService);
    protected readonly language = inject(LanguageService);

    readonly activeItem = input<{ type: string; id: number | string } | null>(null);
    readonly previewMode = input.required<'message' | 'hymn' | 'none'>();
    
    protected readonly date = xcomputed([this.row],
        row => sundayIndexToDate(row.week as SundayIndex));

    protected readonly activeId = xcomputed([this.activeItem],
        activeItem => isNaN(activeItem?.id as number) ? null : activeItem!.id as number);
        
    protected readonly tableQueries = xcomputed([this.row, this.previewMode], (row, preview) => {
        switch (preview) {
            case 'message': return [
                {
                    tableName: 'message',
                    id: `sacrament_meeting_message_${row.id}`,
                    query: (table: Table<'message'>) => table.find().eq('sacrament_meeting', row.id),
                },
            ] as readonly RowCardListMultiQuery<SacramentMeetingItemTableName>[];
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
            ] as readonly RowCardListMultiQuery<SacramentMeetingItemTableName>[];
            default: return [
                {
                    tableName: 'message',
                    id: `sacrament_meeting_none_${row.id}`,
                    query: (table: Table<'message'>) => table.find().eq('id', -1),
                }
            ] as readonly RowCardListMultiQuery<SacramentMeetingItemTableName>[];
        }
    });

    protected readonly getItemUrl = (item: RowCardListMultiItem<SacramentMeetingItemTableName> | null) => {
        return item
            ? getRowRoute({ table: item.table, row: item.row as any })
            : getRowRoute({ table: 'sacrament_meeting', row: this.row() });
    }

    protected readonly prepareItemInsert = async (item: RowCardListMultiInsert<SacramentMeetingItemTableName>) => {
        const meetingId = this.row().id;
        (item.row as any).sacrament_meeting = meetingId;

        const anchorPosition = Number((item.row as any).position);
        const position = await this.getSmartPosition(item.tableName, meetingId,
            Number.isFinite(anchorPosition) ? anchorPosition : null);
        (item.row as any).position = position;
    };

    private async getSmartPosition(
        tableName: SacramentMeetingItemTableName,
        meetingId: number,
        anchorPosition: number | null,
    ): Promise<number> {
        const [messages, hymns, performances] = await Promise.all([
            this.supabase.sync.from('message').find().eq('sacrament_meeting', meetingId).get(),
            this.supabase.sync.from('hymn').find().eq('sacrament_meeting', meetingId).get(),
            this.supabase.sync.from('musical_performance').find().eq('sacrament_meeting', meetingId).get(),
        ]);

        const preview = this.previewMode();
        const visibleItemCount = (preview === 'message'
            ? messages
            : preview === 'hymn'
                ? [...hymns, ...performances]
                : []).length;
        return getSmartSacramentMeetingItemPosition({
            tableName,
            previewMode: preview,
            anchorPosition,
            visibleItemCount,
            allPositions: [
                ...messages.map(row => row.position),
                ...hymns.map(row => row.position),
                ...performances.map(row => row.position),
            ],
        });
    }

}
