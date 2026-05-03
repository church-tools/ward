import { MemberCalling } from '@/modules/member-calling/member-calling';
import { MemberCallingListRow } from '@/modules/member-calling/member-calling-list-row';
import { FixedHymnCard } from '@/modules/sacrament-meeting/fixed-hymn-card';
import { HymnListRow } from '@/modules/sacrament-meeting/item/hymn/hymn-list-row';
import { MessageListRow } from '@/modules/sacrament-meeting/item/message/message-list-row';
import { MusicalPerformanceListRow } from '@/modules/sacrament-meeting/item/musical-performance/musical-performance-list-row';
import { SacramentMeetingService } from '@/modules/sacrament-meeting/sacrament-meeting.service';
import { RowCardList } from '@/modules/shared/row-card-list/row-card-list';
import { RowCardListMulti, RowCardListMultiInsert, RowCardListMultiItem, RowCardListMultiQuery } from '@/modules/shared/row-card-list/row-card-list-multi';
import { Insert, Table } from '@/modules/shared/table.types';
import { Button } from '@/shared/form/button/button';
import { CustomRowSelect } from '@/shared/form/row-select/custom-row-select';
import { MultiSelect } from '@/shared/form/select/multi-select';
import { Icon } from '@/shared/icon/icon';
import { LanguageService } from '@/shared/language/language.service';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { LocalizePipe } from '@/shared/language/localize.pipe';
import { SundayIndex, sundayIndexToDate } from '@/shared/utils/date-utils';
import { HoverNudgeDirective } from '@/shared/utils/hover-nudge.directive';
import { xcomputed, xsignal } from '@/shared/utils/signal-utils';
import { SupabaseService } from '@/shared/service/supabase.service';
import { SyncedFieldDirective } from '@/shared/utils/supa-sync/synced-field.directive';
import { SupaSyncedRow } from '@/shared/utils/supa-sync/supa-synced-row';
import { DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Subscription } from 'rxjs';
import { DrawerRouterOutlet } from '../shared/drawer-router-outlet/drawer-router-outlet';
import { PrivatePage } from '../shared/private-page';

type ItemTableName = 'message' | 'hymn' | 'musical_performance';

@Component({
    selector: 'app-current-sacrament-meeting-page',
    templateUrl: './current-sacrament-meeting-page.html',
    imports: [DatePipe, LocalizePipe, RouterModule, Icon, HoverNudgeDirective,
        DrawerRouterOutlet, SyncedFieldDirective, CustomRowSelect, MultiSelect,
        MemberCallingListRow, RowCardList, RowCardListMulti, FixedHymnCard,
        MessageListRow, HymnListRow, MusicalPerformanceListRow, Button],
    host: { class: 'full-width' },
})
export class CurrentSacramentMeetingPage extends PrivatePage {

    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly supabase = inject(SupabaseService);
    protected readonly languageService = inject(LanguageService);
    protected readonly sacramentMeetingService = inject(SacramentMeetingService);
    private readonly popoverRouteSubscription: Subscription;

    protected readonly emptyOptions = [] as const;
    private readonly meetingWeek = xsignal<number | null>(null);
    protected readonly syncedRow = SupaSyncedRow.fromId(this.supabase.sync,
        () => 'sacrament_meeting', this.meetingWeek);

    protected readonly meetingDate = xcomputed([this.syncedRow.value], row =>
        row ? sundayIndexToDate(row.week as SundayIndex) : null);

    protected readonly planningUrl = xcomputed([this.syncedRow.value], row =>
        row ? `/sacrament-meeting/planning/${row.id}` : '/sacrament-meeting/planning');

    protected readonly callingChangesQuery = {
        id: 'sacrament_meeting_calling_changes',
        query: (table: Table<'member_calling'>) => table.find().in('state', ['proposed', 'release_proposed']),
    };

    protected readonly activeMemberCallingId = xcomputed([this.popoverService.rowPopoverTarget], target => {
        if (target?.tableName !== 'member_calling')
            return null;
        return target.id;
    });

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

    protected readonly tableQueries = xcomputed([this.meetingWeek], meetingWeek => {
        if (meetingWeek == null)
            return [] as readonly RowCardListMultiQuery<ItemTableName>[];
        return [
            {
                tableName: 'message',
                id: `sacrament_meeting_message_${meetingWeek}`,
                query: (table: Table<'message'>) => table.find().eq('sacrament_meeting', meetingWeek),
            },
            {
                tableName: 'hymn',
                id: `sacrament_meeting_hymn_${meetingWeek}`,
                query: (table: Table<'hymn'>) => table.find().eq('sacrament_meeting', meetingWeek),
            },
            {
                tableName: 'musical_performance',
                id: `sacrament_meeting_musical_performance_${meetingWeek}`,
                query: (table: Table<'musical_performance'>) => table.find().eq('sacrament_meeting', meetingWeek),
            },
        ] as readonly RowCardListMultiQuery<ItemTableName>[];
    });

    protected navigateHere() {
        this.router.navigate(['.'], { relativeTo: this.route, replaceUrl: true });
    }

    protected readonly getCallingPopoverUrl = (row: MemberCalling.Row | null) => {
        if (!row)
            return this.popoverService.getRowPopoverUrl(this.route, null);
        return this.popoverService.getRowPopoverUrl(this.route, 'member_calling', row.id);
    }

    protected readonly getItemPopoverUrl = (item: RowCardListMultiItem<ItemTableName> | null) => {
        if (!item)
            return this.popoverService.getRowPopoverUrl(this.route, null);
        return this.popoverService.getRowPopoverUrl(this.route, item.table, item.row.id);
    }

    protected async insertItem<T extends ItemTableName>(
        tableName: T,
        insertFn: (item: RowCardListMultiInsert<ItemTableName>) => Promise<void>,
        rowOverrides?: Partial<Insert<T>>,
    ) {
        const row = this.syncedRow.value();
        if (!row)
            return;
        const insert = {
            unit: row.unit,
            sacrament_meeting: this.meetingWeek(),
            ...rowOverrides,
        } as Insert<T>;
        await insertFn({ tableName, row: insert });
    }

    protected async insertCustomText(insertFn: (item: RowCardListMultiInsert<ItemTableName>) => Promise<void>) {
        await this.insertItem('message', insertFn,
            { type: 'message', speaker: null, topic: '', duration: null });
    }

    private async setCurrentMeetingWeek() {
        const meeting = await this.sacramentMeetingService.assureCurrentOrUpcomingMeeting();
        this.meetingWeek.set(meeting.week);
    }

    constructor() {
        super();
        this.popoverRouteSubscription = this.popoverService.bindRowPopoverRoute(this.route);
        void this.setCurrentMeetingWeek();
    }

    override ngOnDestroy() {
        this.popoverRouteSubscription.unsubscribe();
        super.ngOnDestroy();
    }

}