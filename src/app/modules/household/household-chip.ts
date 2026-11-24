import { Chip } from '@/shared/widget/chip/chip';
import { Component, computed, input } from '@angular/core';
import type { Household } from './household';

@Component({
    selector: 'app-household-chip',
    imports: [Chip],
    template: `
        <app-chip [background]="[household().color_1, household().color_2]">
            <span>{{ household().name }}</span>
            @if (firstNames()) {
                <span class="tiny-text opacity-75 overflow-ellipsis">{{ firstNames() }}</span>
            }
        </app-chip>
    `,
    host: { class: 'display-block' },
})
export class HouseholdChip {

    readonly household = input.required<Household.Row>();

    protected readonly firstNames = computed(() => this.household()._calculated.firstNames.join(', '));
}
