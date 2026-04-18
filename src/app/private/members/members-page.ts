import { Member } from '@/modules/member/member';
import { MemberListInsert } from '@/modules/member/member-list-insert';
import { MemberListRow } from '@/modules/member/member-list-row';
import { RowCardList } from "@/modules/shared/row-card-list/row-card-list";
import { Table } from '@/modules/shared/table.types';
import LinkButton from '@/shared/form/button/link/link-button';
import { LocalizePipe } from '@/shared/language/localize.pipe';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
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
                <span class="h0">{{ 'MEMBERS_PAGE.TITLE' | localize }}</span>
                <div class="row">
                    <app-link-button href="https://lcr.churchofjesuschrist.org/records/member-list"
                        icon="open"
                        outside newTab type="secondary">
                        <span outside>{{ 'MEMBERS_PAGE.LCR_MEMBER_LIST' | localize }}</span>
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
                <app-link-button icon="archive_arrow_back" type="subtle" size="large" hideNewTab
                    href="/members/import">
                    {{ 'MEMBERS_PAGE.IMPORT_FROM_LCR' | localize }}
                </app-link-button>
            </div>
        </app-drawer-router-outlet>
    `,
    imports: [LocalizePipe, RowCardList, MemberListRow, MemberListInsert, LinkButton,
    LinkButton, DrawerRouterOutlet],
    host: { class: 'full-width' },
})
export class MembersPage extends PrivatePage {

    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);

    protected readonly activeMemberId = signal<number | null>(null);
    
    protected readonly getQuery = {
        query: (table: Table<'member'>) => table.readAll(),
        id: 'members',
    };

    protected getUrl = (member: Member.Row | null) =>  member
        ? getRowRoute({ table: 'member', row: member })
        : '/members';

    protected navigateHere() {
        this.router.navigate(['.'], { relativeTo: this.route, replaceUrl: true });
    }

    protected onActivate(id: string | null) {
        this.activeMemberId.set(id ? +id : null);
    }
}