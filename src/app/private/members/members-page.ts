import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { Member } from '../../modules/member/member';
import { RowCardListComponent } from "../../modules/shared/row-card-list";
import { Table } from '../../modules/shared/table.types';
import ButtonComponent from '../../shared/form/button/button';
import LinkButtonComponent from '../../shared/form/button/link/link-button';
import { PopoverService } from '../../shared/widget/popover/popover.service';
import { PrivatePageComponent } from '../shared/private-page';
import { RouterOutletDrawerComponent } from "../shared/router-outlet-drawer/router-outlet-drawer";

@Component({
    selector: 'app-members-page',
    template: `
        <app-router-outlet-drawer
            (onClose)="navigateHere()"
            (activated)="onActivate($event)">
            <div class="page narrow gap-4">
                <span class="h0">{{ 'MEMBERS_PAGE.TITLE' | translate }}</span>
                <div class="row">
                    <app-link-button href="https://lcr.churchofjesuschrist.org/records/member-list"
                        icon="open"
                        [outside]="true" [newTab]="true" type="secondary">
                        <span outside>{{ 'MEMBERS_PAGE.LCR_MEMBER_LIST' | translate }}</span>
                    </app-link-button>
                </div>
                <app-row-card-list
                    tableName="member"
                    [getQuery]="getQuery"
                    [editable]="true"
                    [page]="this"
                    [getUrl]="getMemberUrl"
                    [activeId]="activeMemberId()"/>
                <app-button icon="archive_arrow_back" type="subtle" size="large"
                    (click)="openImportDialog()">
                    {{ 'MEMBERS_PAGE.IMPORT_FROM_LCR' | translate }}
                </app-button>
            </div>
        </app-router-outlet-drawer>
    `,
    imports: [TranslateModule, RowCardListComponent, ButtonComponent,
        LinkButtonComponent, RouterOutletDrawerComponent],
    host: { class: 'full-width' },
})
export class MembersPageComponent extends PrivatePageComponent {

    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);

    protected readonly activeMemberId = signal<number | null>(null);

    protected async openImportDialog() {
        const { MembersImportComponent } = await import('./import/members-import');
        this.popoverService.open(MembersImportComponent);
    }
        
    protected getQuery = (table: Table<'member'>) => table.readAll();
        
    protected getMemberUrl = (member: Member.Row | null) => `/members/${member?.id ?? ""}`;

    protected navigateHere() {
        this.router.navigate(['.'], { relativeTo: this.route });
    }

    protected onActivate(id: string | null) {
        this.activeMemberId.set(id ? +id : null);
    }
}