import { DatePipe } from '@angular/common';
import { Component, inject, input, OnDestroy, signal } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import type {
    SacramentMeetingItem,
    SacramentMeetingItemPreviewMode,
    SacramentMeetingMessage,
    SacramentMeetingMusicalPerformance,
    SacramentMeetingSinging,
} from '@/modules/sacrament-meeting/item/sacrament-meeting-item';
import { getSacramentMeetingItemText, matchesSacramentMeetingItemPreviewMode } from '@/modules/sacrament-meeting/item/sacrament-meeting-item.utils';
import { SupabaseService } from '@/shared/service/supabase.service';
import { xcomputed, xeffect } from '../../shared/utils/signal-utils';
import type { Subscription } from '../../shared/utils/supa-sync/event-emitter';
import { SundayIndex, sundayIndexToDate } from '../../shared/utils/date-utils';
import { createTranslateLocaleSignal } from '../../shared/utils/language-utils';
import { ListRow } from '../shared/row-card-list/list-row';
import { SacramentMeetingViewService } from './sacrament-meeting-view.service';

@Component({
    selector: 'app-sacrament-meeting-list-row',
    standalone: true,
    template: `
        <div class="column full-width m-4 gap-1">
            <div class="row full-width row-gap-1 column-gap-4 items-center">
                <h4>
                    {{ date() | date : 'dd MMM yyyy' : undefined : locale() }}
                </h4>
                @if (row().type; as type) {
                    <span class="text-secondary">{{ meetingView.getTypeLabel(type) }}</span>
                }
            </div>
            @if (previewLines().length) {
                <span class="small-text text-secondary overflow-ellipsis">{{ previewLines().join(' | ') }}</span>
            }
        </div>
    `,
    imports: [TranslateModule, DatePipe],
})
export class SacramentMeetingListRow extends ListRow<'sacrament_meeting'> implements OnDestroy {

    protected readonly meetingView = inject(SacramentMeetingViewService);
    protected readonly translate = inject(TranslateService);
    private readonly supabase = inject(SupabaseService);

    readonly previewMode = input<SacramentMeetingItemPreviewMode>('talks');

    protected readonly locale = createTranslateLocaleSignal(this.translate);
    protected readonly date = xcomputed([this.row],
        row => sundayIndexToDate(row.week as SundayIndex));

    private readonly messageRows = signal<SacramentMeetingMessage.Row[]>([]);
    private readonly singingRows = signal<SacramentMeetingSinging.Row[]>([]);
    private readonly musicalRows = signal<SacramentMeetingMusicalPerformance.Row[]>([]);

    private readonly mergedItems = xcomputed([this.messageRows, this.singingRows, this.musicalRows],
        (messageRows, singingRows, musicalRows) => {
            const merged: SacramentMeetingItem[] = [
                ...messageRows.map(row => ({
                    kind: 'talk' as const,
                    table: 'message' as const,
                    id: row.id,
                    position: row.position,
                    sacrament_meeting: row.sacrament_meeting,
                    row,
                })),
                ...singingRows.map(row => ({
                    kind: 'hymn' as const,
                    table: 'singing' as const,
                    id: row.id,
                    position: row.position,
                    sacrament_meeting: row.sacrament_meeting,
                    row,
                })),
                ...musicalRows.map(row => ({
                    kind: 'musical_performance' as const,
                    table: 'musical_performance' as const,
                    id: row.id,
                    position: row.position,
                    sacrament_meeting: row.sacrament_meeting,
                    row,
                })),
            ];
            return merged.sort((a, b) => (a.position - b.position) || (a.id - b.id));
        });

    protected readonly previewLines = xcomputed([this.mergedItems, this.previewMode],
        (meetingItems, previewMode) => meetingItems
            .filter(item => matchesSacramentMeetingItemPreviewMode(item, previewMode))
            .slice(0, 3)
            .map(item => getSacramentMeetingItemText(item)));

    private messageSubscription: Subscription | undefined;
    private singingSubscription: Subscription | undefined;
    private musicalSubscription: Subscription | undefined;

    constructor() {
        super();
        const messageTable = this.supabase.sync.from('message');
        const singingTable = this.supabase.sync.from('singing');
        const musicalTable = this.supabase.sync.from('musical_performance');

        xeffect([this.row], row => {
            this.messageSubscription?.unsubscribe();
            this.singingSubscription?.unsubscribe();
            this.musicalSubscription?.unsubscribe();

            this.messageRows.set([]);
            this.singingRows.set([]);
            this.musicalRows.set([]);

            this.messageSubscription = messageTable.find().eq('sacrament_meeting', row.id)
                .subscribe(update => {
                    this.messageRows.update(rows => this.mergeRows(rows, update.result, update.deletions));
                });

            this.singingSubscription = singingTable.find().eq('sacrament_meeting', row.id)
                .subscribe(update => {
                    this.singingRows.update(rows => this.mergeRows(rows, update.result, update.deletions));
                });

            this.musicalSubscription = musicalTable.find().eq('sacrament_meeting', row.id)
                .subscribe(update => {
                    this.musicalRows.update(rows => this.mergeRows(rows, update.result, update.deletions));
                });
        });
    }

    private mergeRows<T extends { id: number }>(currentRows: T[], incomingRows?: T[], deletions?: number[]): T[] {
        let mergedRows = [...currentRows];
        if (incomingRows?.length) {
            const byId = new Map(mergedRows.map(row => [row.id, row]));
            for (const row of incomingRows)
                byId.set(row.id, row);
            mergedRows = [...byId.values()];
        }
        if (deletions?.length) {
            const deletionSet = new Set(deletions);
            mergedRows = mergedRows.filter(row => !deletionSet.has(row.id));
        }
        return mergedRows;
    }

    ngOnDestroy() {
        this.messageSubscription?.unsubscribe();
        this.singingSubscription?.unsubscribe();
        this.musicalSubscription?.unsubscribe();
    }
}
