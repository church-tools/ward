import { SacramentMeetingViewService } from '@/modules/sacrament-meeting/sacrament-meeting-view.service';
import { SacramentMeetingService } from '@/modules/sacrament-meeting/sacrament-meeting.service';
import { Icon } from '@/shared/icon/icon';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { LocalizePipe } from '@/shared/language/localize.pipe';
import { DrawerRouterOutlet } from '../shared/drawer-router-outlet/drawer-router-outlet';
import { PrivatePage } from '../shared/private-page';

@Component({
    selector: 'app-current-sacrament-meeting-page',
    template: `
        <app-drawer-router-outlet (onClose)="navigateHere()">
            <div class="page narrow gap-4">
                <span class="h0">{{ 'SACRAMENT_MEETING_PAGE.TITLE' | localize }}</span>
                <a class="stealth card canvas-card selectable-card" routerLink="/sacrament-meeting/planning">
                    <div class="row no-wrap items-center m-6-8">
                        <h3 class="grow-1">
                            <app-icon icon="text_bullet_list_square_edit" filled/>
                            <span class="overflow-ellipsis">{{ 'SACRAMENT_MEETING_PLANNING_PAGE.SHORT_TITLE' | localize }}</span>
                        </h3>
                        <app-icon class="ms-auto" icon="chevron_right"/>
                    </div>
                </a>
            </div>
        </app-drawer-router-outlet>
    `,
    imports: [LocalizePipe, RouterModule, Icon, DrawerRouterOutlet],
    host: { class: 'full-width' },
})
export class CurrentSacramentMeetingPage extends PrivatePage {

    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    protected readonly sacramentMeetingService = inject(SacramentMeetingService);
    protected readonly sacramentMeetingView = inject(SacramentMeetingViewService);

    protected navigateHere() {
        this.router.navigate(['.'], { relativeTo: this.route });
    }

    constructor() {
        super();
        this.sacramentMeetingService.assureUpcomingMeeting();
    }

}