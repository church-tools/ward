import { Household } from '@/modules/household/household';
import { HouseholdListInsert } from '@/modules/household/household-list-insert';
import { HouseholdListRow } from '@/modules/household/household-list-row';
import { RowCardList } from "@/modules/shared/row-card-list/row-card-list";
import { Table } from '@/modules/shared/table.types';
import LinkButton from '@/shared/form/button/link/link-button';
import { LocalizePipe } from '@/shared/language/localize.pipe';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
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
                        <span outside>{{ 'MEMBERS_IMPORT_PAGE.LCR_MEMBER_LIST' | localize }}</span>
                    </app-link-button>
                </div>
                <app-row-card-list #householdList
                    tableName="household"
                    [getQuery]="getQuery"
                    [sort]="sortHouseholds"
                    [getCardClasses]="getHouseholdCardClasses"
                    editable
                    [page]="this">
                    <ng-template #rowTemplate let-row let-page="page" let-onRemove="onRemove">
                        <app-household-list-row [row]="row" [page]="page" [onRemove]="onRemove"
                            [activeMemberId]="activeMemberId()"/>
                    </ng-template>
                    <ng-template #insertTemplate let-functions
                        let-prepareInsert="prepareInsert" let-context="context">
                        <app-household-list-insert
                            [insert]="functions.insert"
                            [cancel]="functions.cancel"
                            [prepareInsert]="prepareInsert"
                            [context]="context"/>
                    </ng-template>
                </app-row-card-list>
                @if (adminService.editMode()) {
                    <app-link-button icon="archive_arrow_back" size="large" hideNewTab
                    [type]="householdList.rowCount() == 0 ? 'primary' : 'secondary'"
                        href="/members/import">
                        {{ 'MEMBERS_PAGE.IMPORT_FROM_LCR' | localize }}
                    </app-link-button>
                }
            </div>
        </app-drawer-router-outlet>
    `,
    imports: [LocalizePipe, RowCardList, HouseholdListRow, HouseholdListInsert, LinkButton,
        DrawerRouterOutlet],
    host: { class: 'full-width' },
})
export class MembersPage extends PrivatePage {

    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);

    protected readonly activeMemberId = signal<number | null>(null);

    protected readonly getQuery = {
        query: (table: Table<'household'>) => table.readAll(),
        id: 'households',
    };

    protected readonly sortHouseholds = (a: Household.Row, b: Household.Row) => compareText(a.name, b.name);

    protected readonly getHouseholdCardClasses = (household: Household.Row) =>
        `duo from-${household.color_1} to-${household.color_2}`;

    protected navigateHere() {
        this.router.navigate(['.'], { relativeTo: this.route, replaceUrl: true });
    }

    protected onActivate(id: string | null) {
        this.activeMemberId.set(id ? +id : null);
    }
}

function compareText(a: string, b: string) {
    return a.localeCompare(b, undefined, { sensitivity: 'base' }) || a.localeCompare(b);
}
