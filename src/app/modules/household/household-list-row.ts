import { getRowRoute } from '@/private/private.routes';
import { Button } from '@/shared/form/button/button';
import LinkButton from '@/shared/form/button/link/link-button';
import { LocalizePipe } from '@/shared/language/localize.pipe';
import { SupabaseService } from '@/shared/service/supabase.service';
import ExpandToggle from '@/shared/widget/expand-toggle/expand-toggle';
import ExpandableCard from '@/shared/widget/expandable-card/expandable-card';
import { Component, computed, inject, input, viewChild } from '@angular/core';
import { ListRow } from '../shared/row-card-list/list-row';
import type { Household } from './household';
import { HouseholdMemberList } from './household-member-list';

@Component({
    selector: 'app-household-list-row',
    template: `
        <app-expandable-card #card>
            <div cardHeader class="row items-center gap-2 m-4">
                <div class="column duo-title grow-1">
                    <h4 class="overflow-ellipsis">{{ row().name }}</h4>
                    <span class="overflow-ellipsis">{{ memberNames() }}</span>
                </div>
                <app-link-button icon="edit" type="subtle" class="icon-only" hideNewTab
                    [href]="getSettingsUrl(row())"/>
                @if (memberNames().length === 0) {
                    <app-button icon="delete" type="subtle" class="icon-only"
                        [title]="'DELETE' | localize"
                        (onClick)="remove()"/>
                }
                <app-expand-toggle [expanded]="card.expanded()" (toggle)="card.toggle()"/>
            </div>
            @if (card.contentVisible()) {
                <div class="ps-4 pe-4 pb-4">
                    <app-household-member-list
                        [household]="row()"
                        [activeMemberId]="activeMemberId()"
                        [page]="page()"/>
                </div>
            }
        </app-expandable-card>
    `,
    imports: [LocalizePipe, Button, LinkButton, ExpandToggle, ExpandableCard, HouseholdMemberList],
    host: { class: 'full-width' },
})
export class HouseholdListRow extends ListRow<'household'> {

    private readonly supabase = inject(SupabaseService);

    readonly activeMemberId = input<number | null>(null);

    protected readonly memberNames = computed(() => this.row()._calculated.firstNames.join(', '));

    protected readonly getSettingsUrl = (household: Household.Row) =>
        getRowRoute({ table: 'household', row: household });

    protected async remove() {
        const count = await this.supabase.sync.from('member')
            .find().eq('household', this.row().id).count();
        if (count > 0)
            return;
        await this.onRemove()?.(this.row());
    }
}
