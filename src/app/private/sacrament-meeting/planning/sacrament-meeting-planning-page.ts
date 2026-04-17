import { HymnViewService } from '@/modules/sacrament-meeting/item/hymn/hymn-view.service';
import { MessageViewService } from '@/modules/sacrament-meeting/item/message/message-view.service';
import { SacramentMeeting } from '@/modules/sacrament-meeting/sacrament-meeting';
import { SacramentMeetingListInsert } from '@/modules/sacrament-meeting/sacrament-meeting-list-insert';
import { SacramentMeetingListRow } from '@/modules/sacrament-meeting/sacrament-meeting-list-row';
import { SacramentMeetingService } from '@/modules/sacrament-meeting/sacrament-meeting.service';
import { RowCardList } from '@/modules/shared/row-card-list/row-card-list';
import { Table } from '@/modules/shared/table.types';
import LinkButton from '@/shared/form/button/link/link-button';
import { SelectOption } from '@/shared/form/select/select';
import SwitchSelect from '@/shared/form/select/switch/switch-select';
import { getUpcomingSundayIndex } from '@/shared/utils/date-utils';
import { xcomputed, xsignal } from '@/shared/utils/signal-utils';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LocalizePipe } from '@/shared/language/localize.pipe';
import { getRowRoute } from '../../private.routes';
import { DrawerRouterOutlet } from '../../shared/drawer-router-outlet/drawer-router-outlet';
import { PrivatePage } from '../../shared/private-page';

const PREVIEW_MODE_KEY = 'sacrament_meeting_planning_preview_mode';
const PAST_KEY = 'sacrament_meeting_planning_past';

@Component({
    selector: 'app-planning-page',
    templateUrl: './sacrament-meeting-planning-page.html',
    imports: [LocalizePipe, SwitchSelect, RowCardList, SacramentMeetingListRow,
        SacramentMeetingListInsert, DrawerRouterOutlet, LinkButton],
    host: { class: 'full-width' },
})
export class SacramentMeetingPlanningPage extends PrivatePage {

    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly sacramentMeetingService = inject(SacramentMeetingService);
    private readonly messageView = inject(MessageViewService);
    private readonly hymnView = inject(HymnViewService);
    
    protected readonly previewMode = xsignal<'message' | 'hymn' | 'none'>(localStorage.getItem(PREVIEW_MODE_KEY) as any || 'none');
    protected readonly past = xsignal<'month' | 'all' | 'none'>(localStorage.getItem(PAST_KEY) as any || 'none');

    protected readonly pastOptions = [
        { value: 'none', view: 'NONE', icon: 'circle_small' },
        { value: 'month', view: 'SACRAMENT_MEETING_PLANNING_PAGE.PAST_MONTH', icon: 'calendar' },
        { value: 'all', view: 'SACRAMENT_MEETING_PLANNING_PAGE.PAST_ALL', icon: 'archive' }
    ] as SelectOption<'month' | 'all' | 'none'>[];

    protected readonly previewModeOptions = [
        { value: 'message', view: 'VIEW.MESSAGES', icon: this.messageView.icon },
        { value: 'none', view: 'NONE', icon: 'circle_small' },
        { value: 'hymn', view: 'VIEW.HYMNS', icon: this.hymnView.icon },
    ] as SelectOption<'message' | 'hymn' | 'none'>[];

    protected readonly getQuery = xcomputed([this.past], past => {
        const currentWeek = getUpcomingSundayIndex();
        switch (past) {
            case 'none': return {
                id: `sacrament_meetings`,
                query: (table: Table<'sacrament_meeting'>) => table.find().gt('week', currentWeek - 1),
                mutable: true,
            };
            case 'month': return {
                id: `sacrament_meetings_past_month`,
                query: (table: Table<'sacrament_meeting'>) => table.find().gt('week', currentWeek - 4),
                mutable: true,
            };
            case 'all': return {
                id: `sacrament_meetings_past_all`,
                query: (table: Table<'sacrament_meeting'>) => table.readAll(),
                mutable: true,
            };
        }
    });

    protected readonly activeId = xsignal<number | null>(null);

    constructor() {
        super();
        this.sacramentMeetingService.assureUpcomingMeeting();
    }

    protected onPastChange(value: string | number | null) {
        this.past.set(value as 'month' | 'all' | 'none');
        localStorage.setItem(PAST_KEY, value as string);
    }

    protected onPreviewModeChange(value: string | number | null) {
        this.previewMode.set(value as 'message' | 'hymn' | 'none');
        localStorage.setItem(PREVIEW_MODE_KEY, value as string);
    }

    protected getChurchServiceUrl = (row: SacramentMeeting.Row | null) => {
        return row ? getRowRoute({ table: 'sacrament_meeting', row }) : '/sacrament-meeting/planning';
    }

    navigateHere(): void {
        this.router.navigate(['.'], { relativeTo: this.route, replaceUrl: true });
    }

    protected onActivate(id: string | null) {
        this.activeId.set(id
            ? Number(id.includes('/') ? id.split('/')[1] : id)
            : null);
    }
}
