import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { Member } from '../../modules/member/member';
import { MemberListInsert } from '../../modules/member/member-list-insert';
import { MemberListRow } from '../../modules/member/member-list-row';
import { RowCardList } from "../../modules/shared/row-card-list/row-card-list";
import { Table } from '../../modules/shared/table.types';
import { Button } from '../../shared/form/button/button';
import LinkButton from '../../shared/form/button/link/link-button';
import { getRowRoute } from '../private.routes';
import { DrawerRouterOutlet } from "../shared/drawer-router-outlet/drawer-router-outlet";
import { PrivatePage } from '../shared/private-page';

@Component({
    selector: 'app-members-page',
    template: `
        <app-drawer-router-outlet
            (onClose)="navigateHere()"
            (activated)="onActivate($event)">
            <div class="page narrow gap-4">
                <span class="h0">{{ 'MEMBERS_PAGE.TITLE' | translate }}</span>
                <div class="row">
                    <app-link-button href="https://lcr.churchofjesuschrist.org/records/member-list"
                        icon="open"
                        outside newTab type="secondary">
                        <span outside>{{ 'MEMBERS_PAGE.LCR_MEMBER_LIST' | translate }}</span>
                    </app-link-button>
                </div>
                <app-row-card-list
                    tableName="member"
                    [getQuery]="getQuery"
                    editable
                    [page]="this"
                    [getUrl]="getUrl"
                    [activeId]="activeMemberId()">
                    <ng-template #rowTemplate let-row let-page="page" let-onRemove="onRemove">
                        <app-member-list-row [row]="row" [page]="page" [onRemove]="onRemove"/>
                    </ng-template>
                    <ng-template #insertTemplate let-functions
                        let-prepareInsert="prepareInsert" let-context="context">
                        <app-member-list-insert
                            [insert]="functions.insert"
                            [cancel]="functions.cancel"
                            [prepareInsert]="prepareInsert"
                            [context]="context"/>
                    </ng-template>
                </app-row-card-list>
                <app-button icon="archive_arrow_back" type="subtle" size="large"
                    (click)="openImportDialog()">
                    {{ 'MEMBERS_PAGE.IMPORT_FROM_LCR' | translate }}
                </app-button>
            </div>
        </app-drawer-router-outlet>
    `,
    imports: [TranslateModule, RowCardList, MemberListRow, MemberListInsert, Button,
    LinkButton, DrawerRouterOutlet],
    host: { class: 'full-width' },
})
export class MembersPage extends PrivatePage {

    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);

    protected readonly activeMemberId = signal<number | null>(null);
    
    protected readonly getQuery = {
        query: (table: Table<'member'>) => table.readAll(),
        id: 'members'
    };

    protected async openImportDialog() {
        const { MembersImport } = await import('./import/members-import');
        this.popoverService.open(MembersImport);
    }
        
    protected getUrl = (member: Member.Row | null) =>  member
        ? getRowRoute({ table: 'member', row: member })
        : '/members';

    protected navigateHere() {
        this.router.navigate(['.'], { relativeTo: this.route });
    }

    protected onActivate(id: string | null) {
        this.activeMemberId.set(id ? +id : null);
    }
}