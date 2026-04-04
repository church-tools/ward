import { SacramentMeeting } from '@/modules/sacrament-meeting/sacrament-meeting';
import { SacramentMeetingListInsert } from '@/modules/sacrament-meeting/sacrament-meeting-list-insert';
import { SacramentMeetingListRow } from '@/modules/sacrament-meeting/sacrament-meeting-list-row';
import { SacramentMeetingService } from '@/modules/sacrament-meeting/sacrament-meeting.service';
import { RowCardList } from '@/modules/shared/row-card-list/row-card-list';
import { Table } from '@/modules/shared/table.types';
import LinkButton from '@/shared/form/button/link/link-button';
import { Select } from '@/shared/form/select/select';
import Switch from '@/shared/form/switch/switch';
import { getUpcomingSundayIndex } from '@/shared/utils/date-utils';
import { xcomputed, xsignal } from '@/shared/utils/signal-utils';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { getRowRoute } from '../../private.routes';
import { DrawerRouterOutlet } from '../../shared/drawer-router-outlet/drawer-router-outlet';
import { PrivatePage } from '../../shared/private-page';

@Component({
    selector: 'app-planning-page',
    templateUrl: './sacrament-meeting-planning-page.html',
    imports: [TranslateModule, Switch, Select, RowCardList, SacramentMeetingListRow,
        SacramentMeetingListInsert, DrawerRouterOutlet, LinkButton],
    host: { class: 'full-width' },
})
export class SacramentMeetingPlanningPage extends PrivatePage {

    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly sacramentMeetingService = inject(SacramentMeetingService);
    
    protected readonly showPastMeetings = xsignal(false);
    protected readonly previewMode = xsignal<'message' | 'hymn'>('message');

    protected readonly previewModeOptions = [
        { value: 'message', view: 'MESSAGE_PAGE.TITLE' },
        { value: 'hymn', view: 'HYMNS_PAGE.TITLE' },
    ] as const;

    protected readonly getQuery = xcomputed([this.showPastMeetings], showPast => {
        const currentWeek = getUpcomingSundayIndex();
        return showPast
            ? {
                query: (table: Table<'sacrament_meeting'>) => table.readAll(),
                id: `sacrament_meetings_all_${currentWeek}`,
            }
            : {
                query: (table: Table<'sacrament_meeting'>) => table.find().gt('week', currentWeek - 1),
                id: `sacrament_meetings_current_${currentWeek}`,
            };
    });

    protected readonly activeChurchServiceId = xsignal<number | null>(null);

    protected onPreviewModeChange(value: string | number | null) {
        this.previewMode.set(value as 'message' | 'hymn');
    }

    protected getChurchServiceUrl = (row: SacramentMeeting.Row | null) => {
        return row ? getRowRoute({ table: 'sacrament_meeting', row }) : '/sacrament-meeting/planning';
    }

    constructor() {
        super();
        this.sacramentMeetingService.assureUpcomingMeeting();
    }

    navigateHere(): void {
        this.router.navigate(['.'], { relativeTo: this.route });
    }


    protected onActivate(id: string | null) {
        this.activeChurchServiceId.set(id ? +id : null);
    }
}
