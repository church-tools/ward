import { Household } from '@/modules/household/household';
import { HouseholdListInsert } from '@/modules/household/household-list-insert';
import { HouseholdListRow } from '@/modules/household/household-list-row';
import { RowCardList } from "@/modules/shared/row-card-list/row-card-list";
import { Table, TableName } from '@/modules/shared/table.types';
import { AsyncButton } from '@/shared/form/button/async/async-button';
import LinkButton from '@/shared/form/button/link/link-button';
import { LocalizePipe } from '@/shared/language/localize.pipe';
import { SupabaseService } from '@/shared/service/supabase.service';
import { PopoverService } from '@/shared/widget/popover/popover.service';
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
                    [type]="householdList.initialized() && !householdList.rowCount() ? 'primary' : 'secondary'"
                        href="/members/import">
                        {{ 'MEMBERS_PAGE.IMPORT_FROM_LCR' | localize }}
                    </app-link-button>
                    <app-async-button icon="delete" type="secondary" size="large"
                        [onClick]="resetMembers">
                        {{ 'MEMBERS_PAGE.RESET_ALL' | localize }}
                    </app-async-button>
                }
            </div>
        </app-drawer-router-outlet>
    `,
    imports: [LocalizePipe, RowCardList, HouseholdListRow, HouseholdListInsert, LinkButton,
        DrawerRouterOutlet, AsyncButton],
    host: { class: 'full-width' },
})
export class MembersPage extends PrivatePage {

    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly supabase = inject(SupabaseService);
    private readonly popover = inject(PopoverService);

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

    protected readonly resetMembers = async () => {
        const confirmed = await this.popover.confirm(
            'DELETE_CONFIRMATION.TITLE',
            'MEMBERS_PAGE.RESET_ALL_CONFIRMATION',
            'DELETE_CONFIRMATION.CONFIRM',
            'DELETE_CONFIRMATION.CANCEL');
        if (!confirmed) return;

        const names: TableName[] = ['member_ministering_in', 'household_ministered_in',
            'ministering_area', 'ministering_district', 'member_calling', 'member', 'household'];
        for (const name of names) await this.deleteAll(name);

        for (const profile of await this.supabase.sync.from('profile').readAll().get())
            if (profile.member !== null)
                await this.supabase.sync.from('profile').update({ ...profile, member: null });
    };

    private async deleteAll(name: TableName) {
        const table: Table<TableName> = this.supabase.sync.from(name);
        const rows = await table.readAll().get();
        if (rows.length) await table.update(rows.map(row => ({ ...row, deleted: true })));
    }
}

function compareText(a: string, b: string) {
    return a.localeCompare(b, undefined, { sensitivity: 'base' }) || a.localeCompare(b);
}
