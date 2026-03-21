import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { SacramentMeetingListInsert } from '../../../modules/sacrament-meeting/sacrament-meeting-list-insert';
import { SacramentMeetingListRow } from '../../../modules/sacrament-meeting/sacrament-meeting-list-row';
import { SacramentMeetingService } from '../../../modules/sacrament-meeting/sacrament-meeting.service';
import { RowCardList } from '../../../modules/shared/row-card-list/row-card-list';
import { Table } from '../../../modules/shared/table.types';
import Switch from '../../../shared/form/switch/switch';
import { getUpcomingSundayIndex } from '../../../shared/utils/date-utils';
import { xcomputed, xsignal } from '../../../shared/utils/signal-utils';
import { DrawerRouterOutlet } from '../../shared/drawer-router-outlet/drawer-router-outlet';
import { PrivatePage } from '../../shared/private-page';

@Component({
    selector: 'app-planning-page',
    templateUrl: './church-service-planning-page.html',
    imports: [TranslateModule, Switch, RowCardList, SacramentMeetingListRow,
        SacramentMeetingListInsert, DrawerRouterOutlet],
    host: { class: 'full-width' },
})
export class ChurchServicePlanningPage extends PrivatePage {

    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly sacramentMeetingService = inject(SacramentMeetingService);
    
    protected readonly showPastMeetings = xsignal(false);

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

    constructor() {
        super();
        this.sacramentMeetingService.assureUpcomingMeeting();
    }

    navigateHere(): void {
        this.router.navigate(['.'], { relativeTo: this.route });
    }

    onActivate(component: any): void {
        // Handle component activation if needed
    }
}
