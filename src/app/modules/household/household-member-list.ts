import { getRowRoute } from '@/private/private.routes';
import { Page } from '@/shared/page/page';
import { Component, computed, input, viewChild } from '@angular/core';
import type { Member } from '../member/member';
import { MemberListInsert } from '../member/member-list-insert';
import { MemberListRow } from '../member/member-list-row';
import { RowCardList } from '../shared/row-card-list/row-card-list';
import type { Table } from '../shared/table.types';

@Component({
    selector: 'app-household-member-list',
    template: `
        <app-row-card-list #list tableName="member"
            [getQuery]="getQuery()"
            [sort]="sortMembers"
            editable
            dragBetweenLists
            [getUrl]="getUrl"
            [activeId]="activeMemberId()"
            [prepareInsert]="prepareInsert"
            [page]="page()">
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
    `,
    imports: [RowCardList, MemberListRow, MemberListInsert],
    host: { class: 'full-width' },
})
export class HouseholdMemberList {

    readonly householdId = input.required<number>();
    readonly activeMemberId = input<number | null>(null);
    readonly page = input<Page>();

    private readonly list = viewChild<RowCardList<'member'>>('list');

    readonly memberCount = computed(() => this.list()?.rowCount() ?? 0);

    protected readonly getQuery = computed(() => {
        const householdId = this.householdId();
        return {
            query: (table: Table<'member'>) => table.find().eq('household', householdId),
            id: `household_members_${householdId}`,
        };
    });

    protected readonly sortMembers = (a: Member.Row, b: Member.Row) =>
        compareText(a.last_name ?? '', b.last_name ?? '') || compareText(a.first_name, b.first_name);

    protected readonly prepareInsert = (member: Member.Insert) => {
        member.household = this.householdId();
    };

    protected getUrl = (member: Member.Row | null) => member
        ? getRowRoute({ table: 'member', row: member })
        : '/members';
}

function compareText(a: string, b: string) {
    return a.localeCompare(b, undefined, { sensitivity: 'base' }) || a.localeCompare(b);
}
