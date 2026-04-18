import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { LocalizePipe } from '@/shared/language/localize.pipe';
import { MemberCalling } from '@/modules/member-calling/member-calling';
import { MemberCallingListRow } from '@/modules/member-calling/member-calling-list-row';
import { OrganizationViewService } from '@/modules/organization/organization-view.service';
import { RowCardList } from "@/modules/shared/row-card-list/row-card-list";
import { Table } from '@/modules/shared/table.types';
import { Icon } from "@/shared/icon/icon";
import { HoverNudgeDirective } from '@/shared/utils/hover-nudge.directive';
import { getRowRoute } from '@/private/private.routes';
import { DrawerRouterOutlet } from "../shared/drawer-router-outlet/drawer-router-outlet";
import { PrivatePage } from '../shared/private-page';

@Component({
    selector: 'app-callings-page',
    templateUrl: './callings-page.html',
    imports: [LocalizePipe, RouterModule, Icon, HoverNudgeDirective, RowCardList, DrawerRouterOutlet, MemberCallingListRow],
    host: { class: 'full-width' },
})
export class CallingsPage extends PrivatePage {

    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    protected readonly organizationView = inject(OrganizationViewService);

    protected readonly activeMemberCallingId = signal<number | null>(null);

    private readonly callingStates = [
        'decided',
        'accepted',
        'rejected',
        'sustained',
        'set_apart',
    ] as const satisfies readonly MemberCalling.State[];

    private readonly releaseStates = [
        'release_issued',
        'release_sustained',
    ] as const satisfies readonly MemberCalling.State[];

    protected readonly getCurrentMemberCallingsQuery = {
        query: (table: Table<'member_calling'>) => table.find().in('state', this.callingStates),
        id: 'current_callings',
    };

    protected readonly getReleaseMemberCallingsQuery = {
        query: (table: Table<'member_calling'>) => table.find().in('state', this.releaseStates),
        id: 'current_releases',
    };

    protected navigateHere() {
        this.router.navigate(['.'], { relativeTo: this.route, replaceUrl: true });
    }

    protected onActivate(id: string | null) {
        this.activeMemberCallingId.set(id ? +id.split('/')[1] : null);
    }

    protected readonly getMemberCallingUrl = (memberCalling: MemberCalling.Row | null) => memberCalling
        ? getRowRoute({ table: 'member_calling', row: memberCalling, currentPage: 'CallingsPage' })
        : '/callings';
    
    constructor() {
        super();
    }

}