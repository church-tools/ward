import { SacramentMeetingViewService } from '@/modules/sacrament-meeting/sacrament-meeting-view.service';
import { SacramentMeetingService } from '@/modules/sacrament-meeting/sacrament-meeting.service';
import { LocalizePipe } from '@/shared/language/localize.pipe';
import LinkCard from '@/shared/widget/link-card/link-card';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DrawerRouterOutlet } from './shared/drawer-router-outlet/drawer-router-outlet';
import { PrivatePage } from './shared/private-page';

@Component({
    selector: 'app-meetings-page',
    template: `
        <app-drawer-router-outlet (onClose)="navigateHere()">
            <div class="page narrow gap-4">
                <span class="h0">{{ 'SACRAMENT_MEETING_PAGE.TITLE' | localize }}</span>
                <app-link-card href="/sacrament-meeting/planning" [icon]="sacramentMeetingView.icon"
                    label="{{ 'SACRAMENT_MEETING_PAGE.TITLE' | localize }}"/>
            </div>
        </app-drawer-router-outlet>
    `,
    imports: [LocalizePipe, LinkCard, DrawerRouterOutlet],
    host: { class: 'full-width' },
})
export class CurrentSacramentMeetingPage extends PrivatePage {

    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    protected readonly sacramentMeetingService = inject(SacramentMeetingService);
    protected readonly sacramentMeetingView = inject(SacramentMeetingViewService);

    protected navigateHere() {
        this.router.navigate(['.'], { relativeTo: this.route, replaceUrl: true });
    }

    constructor() {
        super();
        this.sacramentMeetingService.assureUpcomingMeeting();
    }

}