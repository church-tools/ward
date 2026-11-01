import { getRowRoute } from '@/private/private.routes';
import { SupabaseService } from '@/shared/service/supabase.service';
import { Component, computed, inject, input, viewChild } from '@angular/core';
import { LocalizePipe } from '@/shared/language/localize.pipe';
import { Button } from '@/shared/form/button/button';
import LinkButton from '@/shared/form/button/link/link-button';
import ExpandToggle from '@/shared/widget/expand-toggle/expand-toggle';
import ExpandableCard from '@/shared/widget/expandable-card/expandable-card';
import { ListRow } from '../shared/row-card-list/list-row';
import { HouseholdMemberList } from './household-member-list';
import { HouseholdService } from './household.service';
import type { Household } from './household';

@Component({
    selector: 'app-household-list-row',
    template: `
        <app-expandable-card #card [expanded]="expanded()" (expandedChange)="setExpanded($event)">
            <div cardHeader class="row items-center gap-2 m-4">
                <h4 class="grow-1">{{ row().name }}</h4>
                <app-link-button icon="edit" type="subtle" class="icon-only" hideNewTab
                    [href]="getSettingsUrl(row())"/>
                <app-button icon="delete" type="subtle" class="icon-only"
                    [title]="deleteBlocked() ? ('HOUSEHOLD_PAGE.DELETE_BLOCKED' | localize) : ('DELETE' | localize)"
                    [disabled]="deleteBlocked()"
                    (onClick)="remove()"/>
                <app-expand-toggle [expanded]="expanded()" (toggle)="card.toggle()"/>
            </div>
            <app-household-member-list
                [householdId]="row().id"
                [activeMemberId]="activeMemberId()"
                [page]="page()"/>
        </app-expandable-card>
    `,
    imports: [LocalizePipe, Button, LinkButton, ExpandToggle, ExpandableCard, HouseholdMemberList],
    host: { class: 'full-width' },
})
export class HouseholdListRow extends ListRow<'household'> {

    private readonly supabase = inject(SupabaseService);
    private readonly householdService = inject(HouseholdService);

    readonly activeMemberId = input<number | null>(null);

    private readonly memberList = viewChild(HouseholdMemberList);

    protected readonly expanded = computed(() => this.householdService.isExpanded(this.row().id));
    protected readonly deleteBlocked = computed(() => (this.memberList()?.memberCount() ?? 0) > 0);

    protected readonly getSettingsUrl = (household: Household.Row) =>
        getRowRoute({ table: 'household', row: household });

    protected setExpanded(expanded: boolean) {
        this.householdService.setExpanded(this.row().id, expanded);
    }

    protected async remove() {
        const count = await this.supabase.sync.from('member')
            .find().eq('household', this.row().id).count();
        if (count > 0)
            return;
        await this.onRemove()?.(this.row());
    }
}
