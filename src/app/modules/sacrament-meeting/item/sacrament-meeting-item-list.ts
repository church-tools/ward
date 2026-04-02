import { ProfileService } from '@/modules/profile/profile.service';
import { SupabaseService } from '@/shared/service/supabase.service';
import { xcomputed, xeffect } from '@/shared/utils/signal-utils';
import type { Subscription } from '@/shared/utils/supa-sync/event-emitter';
import { CardListComponent } from '@/shared/widget/card-list/card-list';
import { Component, inject, input, OnDestroy, signal, viewChild } from '@angular/core';
import type { 
    SacramentMeetingItem,
    SacramentMeetingItemCard,
    SacramentMeetingMessage,
    SacramentMeetingMusicalPerformance,
    SacramentMeetingSinging
} from './sacrament-meeting-item';
import { MessageListRow } from './message/message-list-row';
import { MusicalPerformanceListRow } from './musical-performance/musical-performance-list-row';
import { SingingListRow } from './singing/singing-list-row';
import { SacramentMeetingItemListInsert } from './sacrament-meeting-item-list-insert';

@Component({
    selector: 'app-sacrament-meeting-item-list',
    standalone: true,
    template: `
        <app-card-list #cardList
            [editable]="true"
            [getId]="getId"
            [insertRow]="insertRow"
            [activeId]="activeItemId()"
            [itemClicked]="onCardClick"
            [cardClasses]="'card canvas-card suppress-canvas-card-animation'">
            <ng-template #itemTemplate let-item>
                @switch (item.kind) {
                    @case ('talk') {
                        <app-message-list-row [row]="item.row"/>
                    }
                    @case ('hymn') {
                        <app-singing-list-row [row]="item.row"/>
                    }
                    @case ('musical_performance') {
                        <app-musical-performance-list-row [row]="item.row"/>
                    }
                }
            </ng-template>
            <ng-template #insertTemplate let-functions>
                <app-sacrament-meeting-item-list-insert [insert]="functions.insert"/>
            </ng-template>
        </app-card-list>
    `,
    imports: [
        CardListComponent,
        MessageListRow,
        SingingListRow,
        MusicalPerformanceListRow,
        SacramentMeetingItemListInsert,
    ],
    host: { class: 'full-width' },
})
export class SacramentMeetingItemList implements OnDestroy {

    private readonly supabase = inject(SupabaseService);
    private readonly profileService = inject(ProfileService);

    readonly meetingId = input.required<number>();
    readonly activeItemId = input<number | null>(null);
    readonly onItemClick = input<(item: SacramentMeetingItem) => void>();

    protected readonly cardList = viewChild.required<CardListComponent<SacramentMeetingItemCard, number>>('cardList');

    private readonly messageRows = signal<SacramentMeetingMessage.Row[]>([]);
    private readonly singingRows = signal<SacramentMeetingSinging.Row[]>([]);
    private readonly musicalRows = signal<SacramentMeetingMusicalPerformance.Row[]>([]);

    private readonly items = xcomputed([this.messageRows, this.singingRows, this.musicalRows],
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

    private readonly messageTable = this.supabase.sync.from('message');
    private readonly singingTable = this.supabase.sync.from('singing');
    private readonly musicalTable = this.supabase.sync.from('musical_performance');

    private messageSubscription: Subscription | undefined;
    private singingSubscription: Subscription | undefined;
    private musicalSubscription: Subscription | undefined;
    private previousIds = new Set<number>();

    protected readonly getId = (item: SacramentMeetingItemCard) => item.id;

    protected readonly onCardClick = (item: SacramentMeetingItemCard) => {
        if ('draft' in item)
            return;
        this.onItemClick()?.(item);
    }

    constructor() {
        xeffect([this.meetingId], meetingId => {
            this.messageSubscription?.unsubscribe();
            this.singingSubscription?.unsubscribe();
            this.musicalSubscription?.unsubscribe();
            this.messageRows.set([]);
            this.singingRows.set([]);
            this.musicalRows.set([]);

            this.messageSubscription = this.messageTable.find().eq('sacrament_meeting', meetingId)
                .subscribe(update => this.applyMessageUpdate(update.result, update.deletions));

            this.singingSubscription = this.singingTable.find().eq('sacrament_meeting', meetingId)
                .subscribe(update => this.applySingingUpdate(update.result, update.deletions));

            this.musicalSubscription = this.musicalTable.find().eq('sacrament_meeting', meetingId)
                .subscribe(update => this.applyMusicalUpdate(update.result, update.deletions));
        });

        xeffect([this.cardList, this.items], (cardList, items) => {
            const ids = new Set(items.map(item => item.id));
            const deletions = [...this.previousIds].filter(id => !ids.has(id));
            this.previousIds = ids;
            void cardList.updateItems({ items, deletions });
        });
    }

    protected readonly insertRow = async (item: SacramentMeetingItemCard) => {
        if (!('draft' in item))
            return item;
        const profile = await this.profileService.own.asPromise();
        const meetingId = this.meetingId();
        const position = this.getNextPosition();

        switch (item.kind) {
            case 'talk': {
                const row = await this.messageTable.insert({
                    unit: profile.unit,
                    sacrament_meeting: meetingId,
                    position,
                    speaker: null,
                    topic: null,
                    duration: null,
                });
                return this.mapMessageRow(row);
            }
            case 'hymn': {
                const row = await this.singingTable.insert({
                    unit: profile.unit,
                    sacrament_meeting: meetingId,
                    position,
                    hymn: null,
                });
                return this.mapSingingRow(row);
            }
            case 'musical_performance': {
                const row = await this.musicalTable.insert({
                    unit: profile.unit,
                    sacrament_meeting: meetingId,
                    position,
                    name: null,
                    performers: null,
                });
                return this.mapMusicalRow(row);
            }
        }
    }

    private getNextPosition(): number {
        const items = this.items();
        if (!items.length)
            return 0;
        return Math.max(...items.map(item => item.position)) + 1;
    }

    private applyMessageUpdate(rows?: SacramentMeetingMessage.Row[], deletions?: number[]) {
        this.messageRows.update(currentRows => this.mergeRows(currentRows, rows, deletions));
    }

    private applySingingUpdate(rows?: SacramentMeetingSinging.Row[], deletions?: number[]) {
        this.singingRows.update(currentRows => this.mergeRows(currentRows, rows, deletions));
    }

    private applyMusicalUpdate(rows?: SacramentMeetingMusicalPerformance.Row[], deletions?: number[]) {
        this.musicalRows.update(currentRows => this.mergeRows(currentRows, rows, deletions));
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

    private mapMessageRow(row: SacramentMeetingMessage.Row): SacramentMeetingItem {
        return {
            kind: 'talk',
            table: 'message',
            id: row.id,
            position: row.position,
            sacrament_meeting: row.sacrament_meeting,
            row,
        };
    }

    private mapSingingRow(row: SacramentMeetingSinging.Row): SacramentMeetingItem {
        return {
            kind: 'hymn',
            table: 'singing',
            id: row.id,
            position: row.position,
            sacrament_meeting: row.sacrament_meeting,
            row,
        };
    }

    private mapMusicalRow(row: SacramentMeetingMusicalPerformance.Row): SacramentMeetingItem {
        return {
            kind: 'musical_performance',
            table: 'musical_performance',
            id: row.id,
            position: row.position,
            sacrament_meeting: row.sacrament_meeting,
            row,
        };
    }

    ngOnDestroy(): void {
        this.messageSubscription?.unsubscribe();
        this.singingSubscription?.unsubscribe();
        this.musicalSubscription?.unsubscribe();
    }
}
